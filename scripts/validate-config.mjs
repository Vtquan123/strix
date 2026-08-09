#!/usr/bin/env node
/**
 * Validate config/*.yaml against their JSON Schemas, then check the cross-file
 * invariants a schema cannot express (referential integrity between configs, and
 * agreement between the configs and what is actually on disk).
 *
 *   node scripts/validate-config.mjs
 */
import { readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import Ajv from 'ajv';
import { ROOT, loadAll, loadSchema, loadJson, dirNames, readFrontmatter } from './lib/config.mjs';

const problems = [];
const fail = (msg) => problems.push(msg);

const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const missing = (want, have) => want.filter((x) => !have.includes(x));

/* ── 1. schema validation ───────────────────────────────────────────── */

const cfg = loadAll();
const ajv = new Ajv({ allErrors: true, strict: false });

for (const [name, key] of [
  ['routing', 'routing'],
  ['capabilities', 'capabilities'],
  ['skills', 'skills'],
  ['task-schema', 'taskSchema'],
]) {
  const validate = ajv.compile(loadSchema(name));
  if (!validate(cfg[key])) {
    for (const e of validate.errors) {
      fail(`config/${name}.yaml${e.instancePath || ''}: ${e.message}`);
    }
  }
}

const { routing, capabilities, skills, taskSchema } = cfg;

/* ── 2. referential integrity between configs ───────────────────────── */

const intentIds = routing.intents.map((i) => i.id);
const complexityIds = routing.complexity_levels.map((c) => c.id);
const skillNames = skills.skills.map((s) => s.name);
const agentNames = skills.agents.map((a) => a.name);
const capabilityIds = capabilities.capabilities.map((c) => c.id);
const engineIds = capabilities.engines.map((e) => e.id);

for (const [idx, r] of routing.routes.entries()) {
  const at = `config/routing.yaml routes[${idx}] (${r.intent})`;
  if (!intentIds.includes(r.intent)) fail(`${at}: unknown intent "${r.intent}"`);
  for (const c of r.complexity) {
    if (c !== 'any' && !complexityIds.includes(c)) fail(`${at}: unknown complexity "${c}"`);
  }
  if (r.complexity.includes('any') && r.complexity.length > 1) {
    fail(`${at}: "any" cannot be combined with specific complexity levels`);
  }
  if (!agentNames.includes(r.agent)) fail(`${at}: unknown agent "${r.agent}"`);
  for (const s of r.skills) {
    if (!skillNames.includes(s)) fail(`${at}: unknown skill "${s}"`);
  }
  if (r.then && skillNames.includes(r.then) === false) {
    // `then` may be a Cline workflow or the literal "decompose"; only warn on typos
    // that look like a skill name but are not one of the known follow-ons.
    const knownFollowOns = ['implement', 'fix', 'refactor', 'testing', 'review-fixes', 'decompose'];
    if (!knownFollowOns.includes(r.then)) {
      fail(`${at}: "then: ${r.then}" is neither a known Cline workflow nor a built-in skill`);
    }
  }
}

const uncovered = missing(intentIds, routing.routes.map((r) => r.intent));
if (uncovered.length) fail(`config/routing.yaml: intents with no route: ${uncovered.join(', ')}`);

const dre = routing.decision_record_example;
if (!intentIds.includes(dre.intent)) fail(`decision_record_example: unknown intent "${dre.intent}"`);
if (!complexityIds.includes(dre.complexity)) fail(`decision_record_example: unknown complexity`);
if (!capabilityIds.includes(dre.capability)) {
  fail(`decision_record_example: unknown capability "${dre.capability}"`);
}
for (const s of dre.skills) {
  if (!skillNames.includes(s)) fail(`decision_record_example: unknown skill "${s}"`);
}

for (const c of capabilities.capabilities) {
  const declared = Object.keys(c.access).sort();
  if (!eq(declared, [...engineIds].sort())) {
    fail(`config/capabilities.yaml ${c.id}: access must cover every engine (${engineIds.join(', ')})`);
  }
  const owners = engineIds.filter((e) => c.access[e] === 'owns');
  if (c.mode === 'exclusive' && owners.length !== 1) {
    fail(`config/capabilities.yaml ${c.id}: mode exclusive but ${owners.length} owner(s)`);
  }
  if (c.mode === 'shared' && owners.length === 0) {
    fail(`config/capabilities.yaml ${c.id}: mode shared but no owner`);
  }
  for (const e of Object.keys(c.constraints ?? {})) {
    if (!engineIds.includes(e)) fail(`config/capabilities.yaml ${c.id}: constraint for unknown engine "${e}"`);
  }
}

const cxField = taskSchema.header_fields.find((f) => f.enum_from === 'routing.complexity_levels');
if (!cxField) fail('config/task-schema.yaml: no field pulls the complexity enum from routing.yaml');

const lifecycleStatuses = taskSchema.lifecycle.map((l) => l.status);
const statusField = taskSchema.header_fields.find((f) => f.name === 'Status');
if (statusField && !eq([...statusField.enum].sort(), [...lifecycleStatuses].sort())) {
  fail('config/task-schema.yaml: Status enum does not match the lifecycle stage statuses');
}

/* ── 3. configs vs what is on disk ──────────────────────────────────── */

const skillDirs = dirNames('skills');
if (!eq([...skillNames].sort(), skillDirs)) {
  const inYaml = missing(skillNames, skillDirs);
  const onDisk = missing(skillDirs, skillNames);
  if (inYaml.length) fail(`config/skills.yaml lists skills with no skills/ directory: ${inYaml.join(', ')}`);
  if (onDisk.length) fail(`skills/ directories missing from config/skills.yaml: ${onDisk.join(', ')}`);
}

const agentFiles = readdirSync(join(ROOT, 'agents'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => basename(f, '.md'))
  .sort();
if (!eq([...agentNames].sort(), agentFiles)) {
  fail(`config/skills.yaml agents (${agentNames.join(', ')}) do not match agents/*.md (${agentFiles.join(', ')})`);
}

/* ── 4. frontmatter contracts (Agent Skills spec) ───────────────────── */

function checkFrontmatter(label, absPath, expectedName) {
  const { frontmatter, frontmatterText } = readFrontmatter(absPath);
  if (!frontmatter) {
    fail(`${label}: frontmatter must start at byte 0 with "---" and close with "---"`);
    return;
  }
  if (frontmatter.name !== expectedName) {
    fail(`${label}: name "${frontmatter.name}" must match "${expectedName}"`);
  }
  if (!frontmatter.description) fail(`${label}: description is required`);
  else if (frontmatter.description.length > 1024) {
    fail(`${label}: description is ${frontmatter.description.length} chars (spec max 1024)`);
  }
  if (/[<>]/.test(frontmatterText)) {
    fail(`${label}: frontmatter contains "<" or ">" — can inject instructions into the system prompt`);
  }
  const meta = frontmatter.metadata;
  if (!meta || !meta.kind || !meta.engine) {
    fail(`${label}: metadata.kind and metadata.engine are required`);
  } else if (!engineIds.includes(meta.engine)) {
    fail(`${label}: metadata.engine "${meta.engine}" is not in config/capabilities.yaml`);
  }
}

for (const name of skillDirs) {
  checkFrontmatter(`skills/${name}/SKILL.md`, join(ROOT, 'skills', name, 'SKILL.md'), name);
}
for (const name of agentFiles) {
  checkFrontmatter(`agents/${name}.md`, join(ROOT, 'agents', `${name}.md`), name);
}

/* ── 5. version parity ──────────────────────────────────────────────── */

const pkgVersion = loadJson('package.json').version;
const pluginVersion = loadJson('.claude-plugin/plugin.json').version;
const marketVersions = loadJson('.claude-plugin/marketplace.json').plugins.map((p) => p.version);
for (const [label, v] of [
  ['.claude-plugin/plugin.json', pluginVersion],
  ...marketVersions.map((v, i) => [`.claude-plugin/marketplace.json plugins[${i}]`, v]),
]) {
  if (v !== pkgVersion) {
    fail(`${label}: version "${v}" != package.json "${pkgVersion}" — run \`npm run gen\``);
  }
}

/* ── report ─────────────────────────────────────────────────────────── */

if (problems.length) {
  console.error(`✗ ${problems.length} config problem(s):`);
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}
console.log('✓ config valid: schemas, cross-references, disk layout, frontmatter, versions');
