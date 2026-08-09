#!/usr/bin/env node
/**
 * Render config/*.yaml into the generated regions of the Markdown docs, and keep
 * the three version fields in sync with package.json.
 *
 *   node scripts/gen-docs.mjs           write
 *   node scripts/gen-docs.mjs --check   exit 1 if anything would change (CI drift gate)
 *
 * A generated region looks like:
 *   <!-- strix:gen start id=routing-table -->
 *   ...generated...
 *   <!-- strix:gen end id=routing-table -->
 * Never hand-edit inside one; edit config/*.yaml and re-run.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadAll, loadJson } from './lib/config.mjs';

const CHECK = process.argv.includes('--check');
const { routing, capabilities, skills, taskSchema } = loadAll();

/* ── formatting helpers ─────────────────────────────────────────────── */

const code = (s) => `\`${s}\``;
const dotList = (arr) => arr.map(code).join(' · ');
const row = (cells) => `| ${cells.join(' | ')} |`;
const table = (headers, aligns, rows) =>
  [row(headers), row(aligns), ...rows.map(row)].join('\n');
const period = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);

const fmtComplexity = (c) => c.join('/');

function fmtDispatch(r) {
  let s = code(r.agent);
  if (r.agent_note) s += ` (${r.agent_note})`;
  if (r.adr) s += ' (+ADR)';
  if (r.then) s += ` → ${code(r.then)}`;
  return s;
}

const fmtSkills = (list) => (list.length ? list.join(', ') : '—');

/* ── renderers, keyed by marker id ──────────────────────────────────── */

const RENDER = {
  'intents-inline': () => dotList(routing.intents.map((i) => i.id)),

  'intents-table': () =>
    table(
      ['Intent', 'Means'],
      ['--------', '-------'],
      routing.intents.map((i) => [code(i.id), i.summary]),
    ),

  'complexity-inline': () => dotList(routing.complexity_levels.map((c) => c.id)),

  'complexity-short': () =>
    routing.complexity_levels.map((c) => `**${c.id}** (${c.short})`).join(' · '),

  'complexity-criteria': () =>
    routing.complexity_levels
      .map((c) => {
        const lines = [
          `### ${c.id}`,
          '',
          `- **What:** ${period(c.what)}`,
          `- **Examples:** ${c.examples.join(', ')}.`,
          `- **Files:** ${period(c.files)}`,
          `- **Planning:** ${period(c.planning)}`,
          `- **Knowledge:** ${period(c.knowledge)}`,
        ];
        if (c.note) lines.push('', `> **${period(c.note)}**`);
        return lines.join('\n');
      })
      .join('\n\n'),

  'complexity-heuristics': () =>
    table(
      ['Signal', 'Likely level'],
      ['--------', '--------------'],
      [
        ...routing.complexity_levels.map((c) => [c.heuristic, c.id]),
        ...(routing.extra_heuristics ?? []).map((h) => [h.signal, h.level]),
      ],
    ),

  'routing-table': () =>
    table(
      ['Intent', 'Complexity', 'Agent / Workflow', 'Typical skills'],
      ['--------', '-----------', '------------------', '----------------'],
      routing.routes.map((r) => [
        r.intent,
        fmtComplexity(r.complexity),
        fmtDispatch(r),
        fmtSkills(r.skills),
      ]),
    ),

  'routing-table-summary': () =>
    table(
      ['Intent', 'Complexity', 'Agent / Workflow'],
      ['--------', '-----------', '------------------'],
      routing.routes.map((r) => [r.intent, fmtComplexity(r.complexity), fmtDispatch(r)]),
    ),

  'decision-record': () => {
    const d = routing.decision_record_example;
    return [
      '```yaml',
      `intent: ${d.intent}`,
      `complexity: ${d.complexity}`,
      `skills: [${d.skills.join(', ')}]`,
      `context: [${d.context.join(', ')}]`,
      `agent: ${d.agent}`,
      `capability: ${d.capability}`,
      '```',
    ].join('\n');
  },

  'capability-legend': () =>
    'Legend: ' +
    Object.values(capabilities.access_levels)
      .map((a) => `${a.symbol} ${a.label}`)
      .join(' · '),

  'capability-matrix': () => {
    const engines = capabilities.engines;
    const sym = (id) => capabilities.access_levels[id].symbol;
    return table(
      ['Capability', ...engines.map((e) => e.label), 'Layer'],
      ['------------', ...engines.map(() => ':------:'), '-------'],
      capabilities.capabilities.map((c) => [
        c.label,
        ...engines.map((e) => sym(c.access[e.id])),
        c.layer,
      ]),
    );
  },

  // Who owns what, derived from `access`. Stays truthful under change: a layer is
  // only claimed wholesale when the engine owns every capability in it; anything
  // partial is listed capability by capability.
  'capability-ownership-summary': () => {
    const engines = capabilities.engines;
    const caps = capabilities.capabilities;
    const inLayer = (layer) => caps.filter((c) => c.layer === layer);

    const lines = engines.map((e) => {
      const owned = caps.filter((c) => c.access[e.id] === 'owns');
      const readOnly = caps.filter((c) => c.access[e.id] === 'read_only');
      const layers = [...new Set(owned.map((c) => c.layer))];
      const whole = layers.filter((l) => inLayer(l).every((c) => c.access[e.id] === 'owns'));
      const partial = owned.filter((c) => !whole.includes(c.layer));

      const owns = [
        whole.length ? `every capability in ${whole.join(', ')}` : null,
        partial.length ? partial.map((c) => c.label).join(', ') : null,
      ].filter(Boolean);

      let line = `- **${e.label}** owns ${owned.length} of ${caps.length} capabilities — ${owns.join('; plus ')}.`;
      if (readOnly.length) {
        line += ` Read-only on ${readOnly.map((c) => c.label).join(', ')}.`;
      }
      return line;
    });

    const shared = caps.filter(
      (c) => engines.filter((e) => c.access[e.id] !== 'forbidden').length > 1,
    );
    lines.push(
      shared.length
        ? `- Shared by more than one engine: ${shared
            .map((c) => {
              const qual = engines
                .filter((e) => c.access[e.id] !== 'forbidden' && c.access[e.id] !== 'owns')
                .map((e) => `${e.label} ${capabilities.access_levels[c.access[e.id]].label}`)
                .concat(
                  Object.entries(c.constraints ?? {}).map(
                    ([id, v]) =>
                      `${engines.find((e) => e.id === id).label} ${v.replace(/_/g, ' ')}`,
                  ),
                );
              return `**${c.label}**${qual.length ? ` (${qual.join('; ')})` : ''}`;
            })
            .join(', ')}.`
        : '- No capability is shared between engines.',
    );
    return lines.join('\n');
  },

  'engines-table': () =>
    table(
      ['Engine', 'Runtime', 'Kind'],
      ['--------', '---------', '------'],
      capabilities.engines.map((e) => [code(e.id), e.runtime, e.kind]),
    ),

  'skills-table': () =>
    table(
      ['Skill', 'Role'],
      ['-------', '------'],
      skills.skills.map((s) => [s.name, s.role]),
    ),

  'skills-inline': () => dotList(skills.skills.map((s) => s.name)),

  'agents-inline': () =>
    skills.agents.map((a) => `${code(a.name)} (${a.role})`).join(' · '),

  'lifecycle-inline': () =>
    '`.strix/tasks/{' + taskSchema.lifecycle.map((l) => l.stage).join(' → ') + '}`',

  'task-fields': () =>
    table(
      ['Field', 'Meaning'],
      ['-------', '---------'],
      [
        ...taskSchema.header_fields.map((f) => [f.name, f.meaning]),
        ...taskSchema.body_sections.map((s) => [s.name, s.meaning]),
      ],
    ),

  'task-header-table': () => {
    const enumOf = (f) =>
      f.enum_from === 'routing.complexity_levels'
        ? routing.complexity_levels.map((c) => c.id)
        : f.enum;
    return table(
      ['Field', 'Value'],
      ['-------', '-------'],
      taskSchema.header_fields.map((f) => {
        const e = enumOf(f);
        return [`**${f.name}**`, e ? e.join(' \\| ') : f.placeholder];
      }),
    );
  },
};

/* ── target files ───────────────────────────────────────────────────── */

const TARGETS = [
  'hooks/strix-context.md',
  'reference/rules/routing.md',
  'reference/docs/router.md',
  'reference/docs/governance.md',
  'reference/docs/skills.md',
  'reference/docs/task-templates.md',
  'reference/workflow/router.md',
  'reference/workflow/capability-matrix.md',
  'reference/workflow/complexity-levels.md',
  'templates/strix/tasks/TEMPLATE.md',
];

const MARKER =
  /<!-- strix:gen start id=([a-z0-9-]+) -->\n[\s\S]*?<!-- strix:gen end id=\1 -->/g;

const used = new Set();
const changed = [];
let errors = 0;

for (const rel of TARGETS) {
  const abs = join(ROOT, rel);
  const before = readFileSync(abs, 'utf8');
  const after = before.replace(MARKER, (_m, id) => {
    const render = RENDER[id];
    if (!render) {
      console.error(`✗ ${rel}: unknown generated-region id "${id}"`);
      errors++;
      return _m;
    }
    used.add(id);
    return `<!-- strix:gen start id=${id} -->\n${render()}\n<!-- strix:gen end id=${id} -->`;
  });
  if (after !== before) {
    changed.push(rel);
    if (!CHECK) writeFileSync(abs, after);
  }
}

/* ── version sync: package.json is the single source ────────────────── */

const version = loadJson('package.json').version;
for (const rel of ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
  const abs = join(ROOT, rel);
  const before = readFileSync(abs, 'utf8');
  const json = JSON.parse(before);
  if (json.version !== undefined) json.version = version;
  if (Array.isArray(json.plugins)) json.plugins.forEach((p) => (p.version = version));
  const after = `${JSON.stringify(json, null, 2)}\n`;
  if (after !== before) {
    changed.push(`${rel} (version → ${version})`);
    if (!CHECK) writeFileSync(abs, after);
  }
}

/* ── report ─────────────────────────────────────────────────────────── */

for (const id of Object.keys(RENDER)) {
  if (!used.has(id)) console.warn(`! renderer "${id}" has no marker in any target file`);
}

if (errors) process.exit(1);

if (CHECK) {
  if (changed.length) {
    console.error('✗ generated docs are stale. Run `npm run gen`. Would change:');
    changed.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log('✓ generated docs are up to date');
} else {
  console.log(changed.length ? `✓ wrote ${changed.length} file(s):` : '✓ nothing to write');
  changed.forEach((f) => console.log(`  - ${f}`));
}
