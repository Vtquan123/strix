#!/usr/bin/env node
/**
 * Validate config/*.yaml against their JSON Schemas, then check the cross-file
 * invariants a schema cannot express (referential integrity between configs, and
 * agreement between the configs and what is actually on disk).
 *
 *   node scripts/validate-config.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import Ajv from 'ajv';
import { parse } from 'yaml';
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
  ['executors', 'executors'],
]) {
  const validate = ajv.compile(loadSchema(name));
  if (!validate(cfg[key])) {
    for (const e of validate.errors) {
      fail(`config/${name}.yaml${e.instancePath || ''}: ${e.message}`);
    }
  }
}

const { routing, capabilities, skills, taskSchema, executors } = cfg;

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
  if (r.escalate) {
    if (!complexityIds.includes(r.escalate)) fail(`${at}: escalate to unknown complexity "${r.escalate}"`);
    continue;
  }
  if (r.agent !== 'orchestrator' && !agentNames.includes(r.agent)) fail(`${at}: unknown agent "${r.agent}"`);
  for (const s of [...r.skills, ...(r.if_unclear ?? [])]) {
    if (!skillNames.includes(s)) fail(`${at}: unknown skill "${s}"`);
  }
  if (r.lite && !(r.complexity.length === 1 && r.complexity[0] === 'TRIVIAL')) {
    fail(`${at}: lite routes are TRIVIAL-only`);
  }
  if (r.then && skillNames.includes(r.then) === false) {
    // `then` may be an executor workflow or the literal "decompose"; only warn on
    // typos that look like a skill name but are not one of the known follow-ons.
    const knownFollowOns = ['implement', 'fix', 'refactor', 'testing', 'review-fixes', 'decompose'];
    if (!knownFollowOns.includes(r.then)) {
      fail(`${at}: "then: ${r.then}" is neither a known executor workflow nor a built-in skill`);
    }
  }
}

// Every intent x complexity cell has exactly one route, so the Router never
// meets a request it has no answer for.
const cells = new Map();
for (const [idx, r] of routing.routes.entries()) {
  for (const c of r.complexity.includes('any') ? complexityIds : r.complexity) {
    const key = `${r.intent} × ${c}`;
    cells.set(key, [...(cells.get(key) ?? []), idx]);
  }
}
for (const intent of intentIds) {
  for (const c of complexityIds) {
    const hits = cells.get(`${intent} × ${c}`) ?? [];
    if (hits.length === 0) fail(`config/routing.yaml: no route for ${intent} × ${c}`);
    if (hits.length > 1) fail(`config/routing.yaml: ${intent} × ${c} is routed ${hits.length} times (routes ${hits.join(', ')})`);
  }
}
// An escalation must land on a real route, not on another escalation.
for (const r of routing.routes.filter((x) => x.escalate)) {
  const target = routing.routes.find((x) => x.intent === r.intent && !x.escalate &&
    (x.complexity.includes('any') || x.complexity.includes(r.escalate)));
  if (!target) fail(`config/routing.yaml: ${r.intent} escalates to ${r.escalate}, which has no real route`);
}

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

/* ── 2b. selectable executor catalog ────────────────────────────────── */

const executorIds = executors.executors.map((e) => e.id);
const dupExecutors = executorIds.filter((id, i) => executorIds.indexOf(id) !== i);
if (dupExecutors.length) fail(`config/executors.yaml: duplicate executor id(s): ${[...new Set(dupExecutors)].join(', ')}`);

if (!executorIds.includes(executors.default)) {
  fail(`config/executors.yaml: default "${executors.default}" is not a declared executor id`);
}

for (const e of executors.executors) {
  const dir = join(ROOT, e.template_dir);
  if (!existsSync(dir)) {
    fail(`config/executors.yaml ${e.id}: template_dir "${e.template_dir}" does not exist`);
  } else if (readdirSync(dir).length === 0) {
    fail(`config/executors.yaml ${e.id}: template_dir "${e.template_dir}" is empty`);
  }
}

// The matrix must keep exactly one generic execution engine that every selectable
// tool fills; more than one would mean the matrix was re-split per tool.
const executionEngines = capabilities.engines.filter((e) => e.runtime === 'execution');
if (executionEngines.length !== 1) {
  fail(`config/capabilities.yaml: expected exactly one execution-runtime engine, found ${executionEngines.length}`);
}

const cxField = taskSchema.header_fields.find((f) => f.enum_from === 'routing.complexity_levels');
if (!cxField) fail('config/task-schema.yaml: no field pulls the complexity enum from routing.yaml');

const lifecycleStatuses = taskSchema.lifecycle.map((l) => l.status);
const statusField = taskSchema.header_fields.find((f) => f.name === 'Status');
if (statusField && !eq([...statusField.enum].sort(), [...lifecycleStatuses].sort())) {
  fail('config/task-schema.yaml: Status enum does not match the lifecycle stage statuses');
}

// bin/strix-task.mjs runs dependency-free in target projects, so it carries its own
// copy of these lists. Read them back out of the source and hold them to config.
{
  const cli = readFileSync(join(ROOT, 'bin', 'strix-task.mjs'), 'utf8');
  const listIn = (name) => {
    const m = cli.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
    return m ? [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : null;
  };
  const priorityField = taskSchema.header_fields.find((f) => f.name === 'Priority');
  for (const [name, want] of [
    ['STAGES', taskSchema.lifecycle.map((l) => l.stage)],
    ['PRIORITIES', priorityField?.enum ?? []],
    ['COMPLEXITIES', complexityIds],
  ]) {
    const have = listIn(name);
    if (!have) fail(`bin/strix-task.mjs: no \`const ${name} = [...]\` to check against config`);
    else if (!eq(have, want)) fail(`bin/strix-task.mjs: ${name} [${have.join(', ')}] != config [${want.join(', ')}]`);
  }

  const sectionNames = taskSchema.body_sections.map((b) => b.name);
  for (const [name, want] of [
    ['SECTIONS', sectionNames],
    ['LITE_SECTIONS', taskSchema.body_sections.filter((b) => b.lite).map((b) => b.name)],
  ]) {
    const have = listIn(name);
    if (!have) fail(`bin/strix-task.mjs: no \`const ${name} = [...]\` to check against config`);
    else if (!eq(have, want)) fail(`bin/strix-task.mjs: ${name} [${have.join(', ')}] != config [${want.join(', ')}]`);
  }

  const noteBlock = cli.match(/const NOTE_SECTIONS = \{([^}]*)\}/);
  const noteHave = noteBlock ? Object.fromEntries([...noteBlock[1].matchAll(/'([^']+)':\s*'([^']+)'/g)].map((x) => [x[1], x[2]])) : null;
  const noteWant = Object.fromEntries(taskSchema.body_sections.filter((b) => b.note).map((b) => [b.name, b.note]));
  if (JSON.stringify(noteHave) !== JSON.stringify(noteWant)) {
    fail(`bin/strix-task.mjs: NOTE_SECTIONS ${JSON.stringify(noteHave)} != config ${JSON.stringify(noteWant)}`);
  }

  // One line per transition: 'from>to': { gate: 'x', reason: true },
  const transBlock = cli.match(/const TRANSITIONS = \{([\s\S]*?)\n\};/);
  const transHave = transBlock
    ? [...transBlock[1].matchAll(/'(\w+)>(\w+)':\s*\{([^}]*)\}/g)].map(([, from, to, body]) => ({
        from,
        to,
        gate: body.match(/gate:\s*'(\w+)'/)?.[1] ?? null,
        reason: /reason:\s*true/.test(body),
      }))
    : null;
  const transWant = taskSchema.transitions.map((t) => ({ from: t.from, to: t.to, gate: t.gate ?? null, reason: Boolean(t.reason) }));
  if (JSON.stringify(transHave) !== JSON.stringify(transWant)) {
    fail(`bin/strix-task.mjs: TRANSITIONS ${JSON.stringify(transHave)} != config ${JSON.stringify(transWant)}`);
  }

  const statusBlock = cli.match(/const STATUS_OF = \{([^}]*)\}/);
  const statusOf = statusBlock
    ? Object.fromEntries([...statusBlock[1].matchAll(/(\w+):\s*'([^']*)'/g)].map((x) => [x[1], x[2]]))
    : null;
  if (!statusOf) fail('bin/strix-task.mjs: no `const STATUS_OF = {...}` to check against config');
  else {
    const want = Object.fromEntries(taskSchema.lifecycle.map((l) => [l.stage, l.status]));
    if (JSON.stringify(statusOf) !== JSON.stringify(want)) {
      fail(`bin/strix-task.mjs: STATUS_OF ${JSON.stringify(statusOf)} != config lifecycle ${JSON.stringify(want)}`);
    }
  }
}

// Transitions must join real stages, once each; a note section must name a stage.
const stageIds = taskSchema.lifecycle.map((l) => l.stage);
const seenMoves = new Set();
for (const t of taskSchema.transitions) {
  const key = `${t.from}>${t.to}`;
  if (!stageIds.includes(t.from) || !stageIds.includes(t.to)) fail(`config/task-schema.yaml transitions ${key}: unknown stage`);
  if (t.from === t.to) fail(`config/task-schema.yaml transitions ${key}: a move must change stage`);
  if (seenMoves.has(key)) fail(`config/task-schema.yaml transitions ${key}: listed twice`);
  seenMoves.add(key);
}
for (const b of taskSchema.body_sections) {
  if (b.note && !stageIds.includes(b.note)) fail(`config/task-schema.yaml body_sections ${b.name}: note stage "${b.note}" is unknown`);
}

// The seeded template carries every section, in order, since strix-task finds
// them by heading.
{
  const templateRel = join('templates', 'strix', 'tasks', 'TEMPLATE.md');
  const headings = [...readFileSync(join(ROOT, templateRel), 'utf8').matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  const matched = taskSchema.body_sections.map((b) => headings.findIndex((h) => h === b.name || h.startsWith(`${b.name} (`)));
  const missingHeadings = taskSchema.body_sections.filter((_b, i) => matched[i] === -1).map((b) => b.name);
  if (missingHeadings.length) fail(`${templateRel}: missing section heading(s): ${missingHeadings.join(', ')}`);
  else if (!eq([...matched].sort((x, y) => x - y), matched)) fail(`${templateRel}: section headings are out of order`);
}

// The board path groups by workstream, so a task must carry the field that says
// which one it is in; without it invariant 2 has nothing to check against.
if (!taskSchema.header_fields.some((f) => f.name === 'Workstream')) {
  fail('config/task-schema.yaml: board.path groups by workstream but no Workstream header field exists');
}

/* ── 2c. the seeded workstream registry ─────────────────────────────── */

// `strix-task` reads this file in target projects with a dependency-free reader
// that only understands the flat shape below. Validating the seed here, with the
// real parser, is what keeps that reader safe to write.
const registryRel = join('templates', 'strix', 'tasks', taskSchema.board.registry);
const registryPath = join(ROOT, registryRel);
if (!existsSync(registryPath)) {
  fail(`${registryRel}: task-schema.yaml declares this registry but the file is missing`);
} else {
  const registry = parse(readFileSync(registryPath, 'utf8'));
  const validateRegistry = ajv.compile(loadSchema('workstreams'));
  if (!validateRegistry(registry)) {
    for (const e of validateRegistry.errors) {
      fail(`${registryRel}${e.instancePath || ''}: ${e.message}`);
    }
  } else {
    const ids = registry.workstreams.map((w) => w.id);
    const prefixes = registry.workstreams.map((w) => w.prefix);
    const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
    const dupPrefixes = prefixes.filter((p, i) => prefixes.indexOf(p) !== i);
    if (dupIds.length) fail(`${registryRel}: duplicate workstream id(s): ${[...new Set(dupIds)].join(', ')}`);
    // Prefixes must be unique or an ID no longer names one workstream, which is
    // the whole point of prefixing them.
    if (dupPrefixes.length) {
      fail(`${registryRel}: duplicate prefix(es): ${[...new Set(dupPrefixes)].join(', ')}`);
    }
    const fallback = registry.workstreams.find((w) => w.id === taskSchema.board.default_workstream);
    if (!fallback) {
      fail(`${registryRel}: default_workstream "${taskSchema.board.default_workstream}" is not registered`);
    } else if (fallback.status !== 'active') {
      fail(`${registryRel}: default_workstream "${fallback.id}" must stay active`);
    }
  }
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

const STRIX_ONLY = 'Strix projects only (requires .strix/).';

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
  // Plugin skills and agents are listed in every session of every project, so
  // they say up front that they only apply where Strix is active. strix-init is
  // the one that runs before .strix/ exists.
  if (expectedName !== 'strix-init' && !String(frontmatter.description ?? '').startsWith(STRIX_ONLY)) {
    fail(`${label}: description must start with "${STRIX_ONLY}"`);
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

// Agents run with every tool unless they list their own. Each must list them,
// none may spawn agents (the orchestrator sequences the work), and the two
// read-only agents may not write files.
const WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];
const READ_ONLY_AGENTS = ['triage-agent', 'reviewer-agent'];
const MODELS = ['inherit', 'sonnet', 'opus', 'haiku', 'fable'];
for (const name of agentFiles) {
  const label = `agents/${name}.md`;
  const { frontmatter } = readFrontmatter(join(ROOT, 'agents', `${name}.md`));
  if (!frontmatter) continue;
  const tools = typeof frontmatter.tools === 'string' ? frontmatter.tools.split(',').map((t) => t.trim()).filter(Boolean) : null;
  if (!tools?.length) {
    fail(`${label}: \`tools:\` must list the agent's tools (comma-separated); without it the agent gets every tool`);
    continue;
  }
  const base = tools.map((t) => t.replace(/\(.*$/, ''));
  if (base.includes('Agent') || base.includes('Task')) fail(`${label}: agents must not spawn agents; drop Agent from tools`);
  if (READ_ONLY_AGENTS.includes(name)) {
    const writes = base.filter((t) => WRITE_TOOLS.includes(t));
    if (writes.length) fail(`${label}: a read-only agent must not have ${writes.join(', ')}`);
  }
  if (frontmatter.model !== undefined && !MODELS.includes(frontmatter.model)) {
    fail(`${label}: model "${frontmatter.model}" is not one of ${MODELS.join(', ')}`);
  }
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
