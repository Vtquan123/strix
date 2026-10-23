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
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { ROOT, loadAll, loadJson } from './lib/config.mjs';
import { renderShared, sharedSection } from './lib/shared-rules.mjs';

const CHECK = process.argv.includes('--check');
const { routing, capabilities, skills, taskSchema, executors } = loadAll();

/* ── formatting helpers ─────────────────────────────────────────────── */

const code = (s) => `\`${s}\``;
const dotList = (arr) => arr.map(code).join(' · ');
const row = (cells) => `| ${cells.join(' | ')} |`;
const table = (headers, aligns, rows) =>
  [row(headers), row(aligns), ...rows.map(row)].join('\n');
const period = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);

const fmtComplexity = (c) => c.join('/');

const ADR_NOTE = { always: ' (+ADR)', 'when-structural': ' (+ADR if structural)' };

function fmtDispatch(r) {
  if (r.escalate) return `reclassify as ${r.escalate}${r.agent_note ? ` (${r.agent_note})` : ''}`;
  let s = r.agent === 'orchestrator' ? 'orchestrator' : code(r.agent);
  if (r.agent_note) s += ` (${r.agent_note})`;
  if (r.adr) s += ADR_NOTE[r.adr];
  if (r.lite) s += ' · lite task, no reviewer';
  if (r.then) s += ` → ${code(r.then)}`;
  return s;
}

const fmtSkills = (r) => {
  if (r.escalate) return '—';
  const base = r.skills.length ? r.skills.join(', ') : '—';
  return r.if_unclear?.length ? `${base}; if unclear first: ${r.if_unclear.join(', ')}` : base;
};

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
        fmtSkills(r),
      ]),
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

  // The plugin's own tree. Every top-level directory needs a description here, so
  // a new one cannot ship undocumented.
  'readme-tree': () => {
    const reasoning = skills.skills.filter((sk) => sk.name !== 'strix-init').length;
    const agentNames = skills.agents.map((a) => a.name.replace(/-agent$/, '')).join(', ');
    const describe = {
      '.claude-plugin': ['.claude-plugin/', 'plugin.json + marketplace.json (versions synced by `npm run gen`)'],
      '.github': ['.github/', 'CI: validate, test, and the generated-docs drift gate'],
      agents: ['agents/', `${skills.agents.length} Claude agents: ${agentNames}`],
      bin: ['bin/', 'strix-init (scaffolder) and strix-task (board CLI, runs strix-task.mjs)'],
      commands: ['commands/', 'slash commands (/strix:init)'],
      config: ['config/', 'YAML source of truth + JSON Schemas; docs are generated from it'],
      docs: ['docs/', 'design specs for the plugin itself (not shipped)'],
      hooks: ['hooks/', 'SessionStart contract (strix-context) + PreToolUse guard (strix-guard)'],
      lib: ['lib/', 'shell helpers shared by strix-init and the hooks'],
      reference: ['reference/', 'framework docs: docs/, workflow/, rules/, examples/'],
      scripts: ['scripts/', 'validate, gen, and the test suites (not shipped)'],
      skills: ['skills/', `${reasoning} reasoning skills + strix-init (one SKILL.md each)`],
      templates: ['templates/', 'seed content: strix/ → .strix/; executors/<id>/ → executor config'],
    };
    // Tracked directories only, so local clutter (.vscode, a scratch .strix/) never counts.
    const tracked = spawnSync('git', ['-C', ROOT, 'ls-files'], { encoding: 'utf8' });
    const top = tracked.status === 0
      ? tracked.stdout.split('\n').filter((f) => f.includes('/')).map((f) => f.split('/')[0])
      : readdirSync(ROOT, { withFileTypes: true })
          // Without git (a tarball), keep the directories this tree knows: a
          // local .strix/ or .vscode/ is not part of the plugin.
          .filter((e) => e.isDirectory() && (!e.name.startsWith('.') || describe[e.name]))
          .map((e) => e.name);
    const dirs = [...new Set(top)]
      .filter((d) => !['.git', 'node_modules'].includes(d))
      .sort((a, b) => a.replace(/^\./, '').localeCompare(b.replace(/^\./, '')));
    const missing = dirs.filter((d) => !describe[d]);
    if (missing.length) throw new Error(`readme-tree: describe these directories: ${missing.join(', ')}`);
    const width = Math.max(...dirs.map((d) => describe[d][0].length)) + 6;
    const lines = dirs.map((d, i) => {
      const branch = i === dirs.length - 1 ? '└── ' : '├── ';
      return `${`${branch}${describe[d][0]}`.padEnd(width)}# ${describe[d][1]}`;
    });
    return ['```text', 'strix/', ...lines, '```'].join('\n');
  },

  'lifecycle-inline': () =>
    '`.strix/tasks/{' + taskSchema.lifecycle.map((l) => l.stage).join(' → ') + '}`',

  'board-path': () => code(`.strix/tasks/${taskSchema.board.path}`),

  'transition-diagram': () => {
    const stages = taskSchema.lifecycle.map((l) => l.stage);
    return [
      '```mermaid',
      'stateDiagram-v2',
      `    [*] --> ${stages[0]}`,
      ...taskSchema.transitions.map((t) => `    ${t.from} --> ${t.to}: ${t.label}`),
      `    ${stages[stages.length - 1]} --> [*]`,
      '```',
    ].join('\n');
  },

  'transition-table': () => {
    const gates = {
      ready: 'no placeholders, Definition of Ready ticked, dependencies Done',
      reported: 'Execution Report filled',
      checklist: 'Review Checklist filled',
    };
    return table(
      ['Move', 'Owner', 'Gate', 'Meaning'],
      ['------', '-------', '------', '---------'],
      taskSchema.transitions.map((t) => [
        `${code(t.from)} → ${code(t.to)}`,
        t.owner,
        [t.gate ? gates[t.gate] : null, t.reason ? '`--reason` required' : null].filter(Boolean).join('; ') || '—',
        t.meaning,
      ]),
    );
  },

  'board-layout': () => {
    const { default_workstream: fallback, registry } = taskSchema.board;
    const [first, second, ...rest] = taskSchema.lifecycle.map((l) => l.stage);
    // Each entry is [tree line, trailing comment]; comments align to the widest.
    const entries = [
      [`│   ├── billing-system/BILL-012-add-invoice-model.md`, 'one EPIC'],
      [`│   ├── search-revamp/SRCH-004-reindex-nightly.md`, 'another, in parallel'],
      [`│   └── ${fallback}/TASK-030-fix-footer-typo.md`, 'belongs to no EPIC'],
    ];
    const width = Math.max(...entries.map(([line]) => line.length));
    return [
      '```',
      '.strix/tasks/',
      `├── ${registry}`,
      '├── TEMPLATE.md',
      `├── ${first}/`,
      ...entries.map(([line, note]) => `${line.padEnd(width + 2)}# ${note}`),
      `├── ${second}/`,
      '│   └── billing-system/BILL-011-add-invoice-api.md',
      ...rest.slice(0, -1).map((st) => `├── ${st}/`),
      `└── ${rest[rest.length - 1]}/`,
      '```',
    ].join('\n');
  },

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

/* ── shared executor rules ──────────────────────────────────────────── */

const SHARED_DIR = join(ROOT, 'templates', 'executors', '_shared');

/**
 * Template variables naming one executor, all derived from its `self_name`:
 * a proper name ("Cline") is used as-is; a generic one ("the executor") gets
 * the article and capitalisation each slot needs.
 */
function executorVars(e) {
  const generic = e.self_name.match(/^the (.+)$/);
  if (!generic) return { Title: e.self_name, Heading: e.self_name, Name: e.self_name, name: e.self_name };
  const words = generic[1];
  const titled = words.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return { Title: titled, Heading: `The ${titled}`, Name: `The ${words}`, name: e.self_name };
}

function sharedFiles(dir = SHARED_DIR) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sharedFiles(join(dir, entry.name))
      : entry.name.endsWith('.md')
        ? [relative(SHARED_DIR, join(dir, entry.name))]
        : [],
  );
}

const renderedShared = (file, executorId) => {
  const e = executors.executors.find((x) => x.id === executorId);
  return renderShared(readFileSync(join(SHARED_DIR, file), 'utf8'), executorId, executorVars(e));
};

// Copilot keeps its rules in one instructions file plus prompt files, so it
// embeds shared sections as generated regions instead of whole files.
const SHARED_REGIONS = {
  'shared.execution.rules': ['execution.md', 'Rules'],
  'shared.execution.commits': ['execution.md', 'Commits and the Execution Report'],
  'shared.execution.stop': ['execution.md', 'Stop Conditions'],
  'shared.execution.scope': ['execution.md', 'Anti-Over-Engineering'],
  'shared.permissions.allowed': ['permissions.md', 'Allowed'],
  'shared.permissions.forbidden': ['permissions.md', 'Forbidden'],
  'shared.coding': ['coding.md', null],
  'shared.guardrails': ['guardrails.md', null],
};

function renderSharedRegion(id, rel) {
  const executorId = rel.match(/^templates\/executors\/([^/]+)\//)?.[1];
  if (!executorId) throw new Error(`${rel}: shared region "${id}" outside an executor template`);
  let spec = SHARED_REGIONS[id];
  const workflow = id.match(/^shared\.workflows\.([a-z-]+)\.(steps|guardrails)$/);
  if (workflow) spec = [`workflows/${workflow[1]}.md`, workflow[2] === 'steps' ? 'Steps' : 'Guardrails'];
  if (!spec) return null;
  return sharedSection(renderedShared(spec[0], executorId), spec[1]);
}

/** Whole rule files for every executor that keeps its rules as separate files. */
const GENERATED_FILES = executors.executors
  .filter((e) => e.rules_format !== 'copilot-instructions')
  .flatMap((e) =>
    sharedFiles().map((file) => ({
      rel: join(e.template_dir, e.config_root, file),
      render: () => renderedShared(file, e.id),
    })),
  );

/* ── target files ───────────────────────────────────────────────────── */

const TARGETS = [
  'hooks/strix-context.md',
  'reference/rules/routing.md',
  'reference/docs/router.md',
  'reference/docs/governance.md',
  'reference/docs/skills.md',
  'reference/docs/task-templates.md',
  'reference/workflow/router.md',
  'README.md',
  'agents/triage-agent.md',
  'reference/workflow/capability-matrix.md',
  'reference/workflow/complexity-levels.md',
  'reference/workflow/task-lifecycle.md',
  'templates/strix/tasks/TEMPLATE.md',
  'templates/strix/tasks/README.md',
  'templates/executors/copilot/.github/copilot-instructions.md',
  'templates/executors/copilot/.github/instructions/coding.instructions.md',
  ...readdirSync(join(ROOT, 'templates/executors/copilot/.github/prompts')).map(
    (f) => `templates/executors/copilot/.github/prompts/${f}`,
  ),
];

const GEN_ID = '[a-z0-9.-]+';
const MARKER = new RegExp(`<!-- strix:gen start id=(${GEN_ID}) -->\n[\\s\\S]*?<!-- strix:gen end id=\\1 -->`, 'g');

const used = new Set();
const changed = [];
let errors = 0;

for (const rel of TARGETS) {
  const abs = join(ROOT, rel);
  const before = readFileSync(abs, 'utf8');
  const after = before.replace(MARKER, (_m, id) => {
    let content;
    if (id.startsWith('shared.')) {
      try {
        content = renderSharedRegion(id, rel);
      } catch (err) {
        console.error(`✗ ${rel}: ${err.message}`);
        errors++;
        return _m;
      }
    } else if (RENDER[id]) {
      used.add(id);
      try {
        content = RENDER[id]();
      } catch (err) {
        console.error(`✗ ${rel}: ${err.message}`);
        errors++;
        return _m;
      }
    }
    if (content == null) {
      console.error(`✗ ${rel}: unknown generated-region id "${id}"`);
      errors++;
      return _m;
    }
    return `<!-- strix:gen start id=${id} -->\n${content}\n<!-- strix:gen end id=${id} -->`;
  });
  if (after !== before) {
    changed.push(rel);
    if (!CHECK) writeFileSync(abs, after);
  }
}

/* ── whole generated files ──────────────────────────────────────────── */

for (const { rel, render } of GENERATED_FILES) {
  const abs = join(ROOT, rel);
  let after;
  try {
    after = render();
  } catch (err) {
    console.error(`✗ ${rel}: ${err.message}`);
    errors++;
    continue;
  }
  const before = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  if (after !== before) {
    changed.push(rel);
    if (!CHECK) {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, after);
    }
  }
}

// Nothing else may live in a generated rules directory: one source only.
const GENERATED_DIR_EXTRAS = ['skills/README.md'];
for (const e of executors.executors.filter((x) => x.rules_format !== 'copilot-instructions')) {
  const dir = join(ROOT, e.template_dir, e.config_root);
  if (!existsSync(dir)) continue;
  const allowed = new Set([...sharedFiles(), ...GENERATED_DIR_EXTRAS]);
  const walk = (d) =>
    readdirSync(d, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(d, entry.name)) : [relative(dir, join(d, entry.name))],
    );
  for (const file of walk(dir).filter((f) => f.endsWith('.md'))) {
    if (!allowed.has(file)) {
      console.error(`✗ ${join(e.template_dir, e.config_root, file)}: not generated from templates/executors/_shared/ — move it there or remove it`);
      errors++;
    }
  }
}

/* ── stray markers: a generated region outside TARGETS renders empty ─── */

// The warning below catches a renderer with no marker. This catches the reverse,
// which is worse: the region ships blank instead of loudly missing.
function markdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // `.git` itself, not `.github`: Copilot's regions live under a .github tree.
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const abs = join(dir, entry.name);
    // The shared sources are templates, not targets; a dot-directory at the
    // root (a local .strix/ board, .vscode/) is not part of the plugin.
    if (entry.isDirectory() && (abs === SHARED_DIR || (dir === ROOT && entry.name.startsWith('.')))) continue;
    if (entry.isDirectory()) out.push(...markdownFiles(abs));
    else if (entry.name.endsWith('.md')) out.push(abs);
  }
  return out;
}

for (const abs of markdownFiles(ROOT)) {
  const rel = relative(ROOT, abs);
  if (TARGETS.includes(rel)) continue;
  // Fenced blocks are stripped first: config/README.md documents the marker
  // syntax by showing it, and that example is not a region to render.
  const text = readFileSync(abs, 'utf8').replace(/^```[\s\S]*?^```/gm, '');
  const ids = [...text.matchAll(new RegExp(`<!-- strix:gen start id=(${GEN_ID}) -->`, 'g'))];
  for (const [, id] of ids) {
    console.error(`✗ ${rel}: has a generated region "${id}" but is not in TARGETS — it will never render`);
    errors++;
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
