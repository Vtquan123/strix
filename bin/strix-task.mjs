#!/usr/bin/env node
/**
 * strix-task — the only thing that should mutate a Strix task board.
 * Run it through the `bin/strix-task` wrapper (or the project shim).
 *
 * The board groups tasks by workstream, one directory level inside every stage:
 *
 *   .strix/tasks/<stage>/<workstream>/<PREFIX>-<n>-<kebab-title>.md
 *
 * Nothing else — no agent, no executor prompt, no human — should build one of
 * those paths by hand. `move` and `where` exist so they never have to.
 *
 * Usage: see USAGE below, or `strix-task --help`.
 *
 * `move` enforces the lifecycle: only the transitions in TRANSITIONS are
 * allowed, each behind its gate, and every move is appended to the task's
 * History. `--override "<reason>"` is the recorded escape hatch.
 *
 * Runs with zero dependencies: target projects install nothing.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { userInfo } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';

/* ── board constants ─────────────────────────────────────────────────
 * Mirrors config/task-schema.yaml `lifecycle` and `board`. The plugin's
 * validate-config owns the source of truth; these are the runtime copy, which
 * `doctor` cross-checks against the registry it actually finds on disk.
 */
const STAGES = ['queue', 'active', 'review', 'done', 'archive'];
const STATUS_OF = {
  queue: 'Queued',
  active: 'In Progress',
  review: 'In Review',
  done: 'Done',
  archive: 'Archived',
};
// Mirrors config/task-schema.yaml `Priority` and config/routing.yaml complexity
// levels; validate-config asserts the two copies agree.
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const COMPLEXITIES = ['TRIVIAL', 'SIMPLE', 'STANDARD', 'EPIC'];
// Mirrors config/task-schema.yaml `body_sections`, in order; the lite subset is
// what `new --lite` keeps, and NOTE_SECTIONS is who may write what, and when.
const SECTIONS = [
  'Goal',
  'Background',
  'Requirements',
  'Out of Scope',
  'Dependencies',
  'Suggested Skills',
  'Estimated Files',
  'Acceptance Criteria',
  'Definition of Ready',
  'Definition of Done',
  'Execution Report',
  'Review Checklist',
  'History',
];
const LITE_SECTIONS = ['Goal', 'Estimated Files', 'Acceptance Criteria', 'Execution Report', 'History'];
const NOTE_SECTIONS = { 'Execution Report': 'active', 'Review Checklist': 'review' };
// Mirrors config/task-schema.yaml `transitions`. Anything else needs --override.
const TRANSITIONS = {
  'queue>active': { gate: 'ready' },
  'queue>archive': { reason: true },
  'active>review': { gate: 'reported' },
  'active>queue': { reason: true },
  'review>active': { gate: 'checklist' },
  'review>queue': { reason: true },
  'review>done': {},
  'done>active': { reason: true },
  'done>archive': {},
};
// Stages a task has left the queue for, so it must carry a Base and no placeholders.
const STARTED_STAGES = ['active', 'review', 'done'];
const REGISTRY_STATUSES = ['active', 'closed'];
const DEFAULT_WORKSTREAM = 'general';
const REGISTRY = 'workstreams.yaml';
// Stages where a task counts as finished, so its workstream may be closed.
const TERMINAL_STAGES = ['done', 'archive'];

// Letters NFD does not split into a base letter plus a mark.
const FOLD = { đ: 'd', ł: 'l', ø: 'o', ß: 'ss', æ: 'ae', œ: 'oe', þ: 'th', ı: 'i' };

/** `Add invoice model` -> `add-invoice-model`, for the filename's trailing slug. */
const slugify = (title) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[đłøßæœþı]/g, (c) => FOLD[c])
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '') || 'task';

const die = (msg) => {
  console.error(`strix-task: ${msg}`);
  process.exit(1);
};

const TASK_ID_RE = /\b([A-Z][A-Z0-9]*)-\d+\b/g;

/** A task or template file, with Windows line endings normalised away. */
const readText = (path) => readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

/** Sort `X-2` before `X-10`. */
function compareIds(a, b) {
  const [pa, na] = [a.replace(/-\d+$/, ''), Number(a.match(/(\d+)$/)?.[1] ?? 0)];
  const [pb, nb] = [b.replace(/-\d+$/, ''), Number(b.match(/(\d+)$/)?.[1] ?? 0)];
  return pa === pb ? na - nb : pa.localeCompare(pb);
}

/** `2026-09-17T16:00:00Z`: second precision is plenty for a history line. */
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/** Who is making a change: --by, then STRIX_ACTOR, then the OS user. */
function actorOf(flags) {
  let actor = flags.by ?? process.env.STRIX_ACTOR ?? process.env.USER;
  if (!actor) {
    try {
      actor = userInfo().username;
    } catch {
      actor = 'unknown';
    }
  }
  actor = String(actor).trim();
  if (!actor || /[\r\n]/.test(actor)) die('--by needs a single-line name');
  return actor;
}

/* ── registry ────────────────────────────────────────────────────────
 * A deliberately tiny reader for the deliberately flat shape that
 * config/schemas/workstreams.schema.json pins down: one `workstreams:` key
 * holding a list of four scalar fields. Anything outside that shape is an error
 * rather than a guess — a silent mis-parse here would corrupt task IDs.
 */
function readRegistry(boardDir) {
  const path = join(boardDir, REGISTRY);
  if (!existsSync(path)) die(`no ${REGISTRY} at ${path} — run \`strix-task migrate\``);

  const entries = [];
  let seenKey = false;
  let current = null;

  for (const [i, raw] of readFileSync(path, 'utf8').split('\n').entries()) {
    const at = `${REGISTRY}:${i + 1}`;
    const line = raw.replace(/\s+#.*$/, '').replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    if (line === 'workstreams:') {
      seenKey = true;
      continue;
    }
    if (!seenKey) die(`${at}: expected "workstreams:" as the first key`);

    const item = line.match(/^ {2}- ([a-z_]+): (.+)$/);
    if (item) {
      current = {};
      entries.push(current);
      current[item[1]] = item[2].trim();
      continue;
    }
    const field = line.match(/^ {4}([a-z_]+): (.+)$/);
    if (field) {
      if (!current) die(`${at}: field outside any list item`);
      current[field[1]] = field[2].trim();
      continue;
    }
    die(`${at}: unsupported syntax "${raw.trim()}" — the registry must stay flat`);
  }

  for (const w of entries) {
    for (const key of ['id', 'prefix', 'owner', 'status']) {
      if (!w[key]) die(`${REGISTRY}: workstream "${w.id ?? '?'}" is missing "${key}"`);
    }
  }
  return entries;
}

/*
 * The registry is edited in place, never regenerated, so the comments people
 * (and the seed) put in it survive every add and close.
 */
function registryAppend(boardDir, w) {
  const path = join(boardDir, REGISTRY);
  const text = readFileSync(path, 'utf8');
  const sep = text.endsWith('\n') ? '' : '\n';
  writeFileSync(path, `${text}${sep}  - id: ${w.id}\n    prefix: ${w.prefix}\n    owner: ${w.owner}\n    status: ${w.status}\n`);
}

function registrySetStatus(boardDir, id, status) {
  const path = join(boardDir, REGISTRY);
  const lines = readFileSync(path, 'utf8').split('\n');
  // Entries may list their keys in any order, so find the block that holds this
  // id and then its status line, wherever each sits.
  const clean = (l) => l.replace(/\s+#.*$/, '').trimEnd();
  const blocks = [];
  for (const [i, line] of lines.entries()) {
    if (/^ {2}- /.test(line)) blocks.push({ start: i, end: lines.length });
    else if (blocks.length && /^\S/.test(line)) blocks[blocks.length - 1].end = Math.min(blocks.at(-1).end, i);
  }
  for (let b = 0; b < blocks.length - 1; b++) blocks[b].end = Math.min(blocks[b].end, blocks[b + 1].start);
  const block = blocks.find(({ start, end }) =>
    lines.slice(start, end).some((l) => clean(l).replace(/^ {2}- /, '    ') === `    id: ${id}`),
  );
  let at = -1;
  if (block) {
    for (let i = block.start; i < block.end; i++) {
      if (/^( {2}- | {4})status:/.test(lines[i])) at = i;
    }
  }
  if (at === -1) die(`${REGISTRY}: cannot find the status line of workstream "${id}"`);
  lines[at] = lines[at].replace(/^( {2}- status:\s*| {4}status:\s*)\S+/, (_m, key) => `${key}${status}`);
  writeFileSync(path, lines.join('\n'));
}

/** A new registry is a copy of the plugin's seed, comments and all. */
function seedRegistry(boardDir) {
  const seed = join(import.meta.dirname, '..', 'templates', 'strix', 'tasks', REGISTRY);
  const text = existsSync(seed)
    ? readFileSync(seed, 'utf8')
    : `workstreams:\n  - id: ${DEFAULT_WORKSTREAM}\n    prefix: TASK\n    owner: shared\n    status: active\n`;
  writeFileSync(join(boardDir, REGISTRY), text);
}

/* ── board scanning ──────────────────────────────────────────────────── */

/**
 * The task id embedded in a filename: `BILL-012-add-invoice.md` -> `BILL-012`.
 * Falls back to the whole basename so a slugless `TASK-012.md` still resolves.
 */
function idOf(file) {
  const m = basename(file, '.md').match(/^([A-Z][A-Z0-9]*-\d+)(?:-|$)/);
  return m ? m[1] : basename(file, '.md');
}

/** Every task on the board, as { id, workstream, stage, path, file }. */
function scanBoard(boardDir) {
  const tasks = [];
  for (const stage of STAGES) {
    const stageDir = join(boardDir, stage);
    if (!existsSync(stageDir)) continue;
    for (const entry of readdirSync(stageDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        for (const file of readdirSync(join(stageDir, entry.name))) {
          if (!file.endsWith('.md')) continue;
          tasks.push({
            id: idOf(file),
            workstream: entry.name,
            stage,
            file,
            path: join(stageDir, entry.name, file),
          });
        }
      } else if (entry.name.endsWith('.md')) {
        // A loose task predates the nested layout; `migrate` relocates it and
        // `doctor` reports it. Recorded with workstream null so both can see it.
        tasks.push({
          id: idOf(entry.name),
          workstream: null,
          stage,
          file: entry.name,
          path: join(stageDir, entry.name),
        });
      }
    }
  }
  return tasks;
}

function findTask(boardDir, id) {
  const hits = scanBoard(boardDir).filter((t) => t.id === id);
  if (hits.length === 0) die(`no task "${id}" on the board`);
  if (hits.length > 1) {
    die(`task "${id}" exists in ${hits.length} places: ${hits.map((h) => h.path).join(', ')}`);
  }
  return hits[0];
}

/* ── task file header ────────────────────────────────────────────────
 * Tasks carry their fields in the generated markdown table at the top of the
 * file, e.g. `| **Status** | Queued |`.
 */
const FIELD_RE = (name) => new RegExp(`^(\\|\\s*\\*\\*${name}\\*\\*\\s*\\|\\s*)(.*?)(\\s*\\|)\\s*$`, 'm');

function readField(text, name) {
  const m = text.match(FIELD_RE(name));
  return m ? m[2].trim() : null;
}

function setField(text, name, value, after = 'ID') {
  const re = FIELD_RE(name);
  // Replacer functions throughout: a string replacement would expand `$&`, `$1`,
  // `$\`` and friends inside user text and corrupt the header.
  if (re.test(text)) return text.replace(re, (_m, open, _old, close) => `${open}${value}${close}`);
  // No row yet (a pre-migration task has no Workstream): insert it after `after`
  // so the header keeps the order the template generates.
  const anchor = text.match(FIELD_RE(after)) ?? text.match(FIELD_RE('ID'));
  if (!anchor) die(`task file has no header table to write "${name}" into`);
  return text.replace(anchor[0], () => `${anchor[0]}\n| **${name}** | ${value} |`);
}

/* ── task file body ──────────────────────────────────────────────────
 * Sections are `## <Name>` headings; `## Definition of Ready (DoR)` counts as
 * "Definition of Ready". A section runs to the next `## ` heading or to the
 * `---` rule above the template's footer.
 */
const isRule = (line) => /^---\s*$/.test(line);
const stripComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '');

function sectionRange(text, name) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l === `## ${name}` || l.startsWith(`## ${name} (`));
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('## ') && !isRule(lines[end])) end++;
  return { lines, start, end };
}

/** A section's text without comments, or null when the section is missing. */
function sectionBody(text, name) {
  const r = sectionRange(text, name);
  return r ? stripComments(r.lines.slice(r.start + 1, r.end).join('\n')).trim() : null;
}

/** Append a block at the end of a section, creating the section if needed. */
function appendToSection(text, name, block) {
  let r = sectionRange(text, name);
  if (!r) {
    const lines = text.split('\n');
    let at = lines.findLastIndex(isRule);
    if (at === -1) at = lines.length;
    lines.splice(at, 0, `## ${name}`, '', '');
    text = lines.join('\n');
    r = sectionRange(text, name);
  }
  const lines = [...r.lines];
  let insert = r.end;
  while (insert > r.start + 1 && lines[insert - 1].trim() === '') insert--;
  // List items stay one list; anything else gets a blank line before it.
  const joinList = block.startsWith('- ') && (lines[insert - 1] ?? '').startsWith('- ');
  const added = [...(joinList ? [] : ['']), ...block.split('\n')];
  lines.splice(insert, 0, ...added);
  // Keep a blank line between the block and whatever follows it.
  const after = insert + added.length;
  if (after < lines.length && lines[after].trim() !== '') lines.splice(after, 0, '');
  return lines.join('\n');
}

// `<...>` spans, possibly over several lines. The whitespace is normalised so a
// placeholder still matches after its line breaks move.
const PLACEHOLDER_RE = /<(?![!/])[^<>]+>/g;
const squash = (s) => s.replace(/\s+/g, ' ').trim();
// The title heading and the header table are filled by the CLI, not the author,
// and their short placeholders (`<ID>`, `<Title>`) look like real content.
const authorText = (text) =>
  stripComments(text)
    .split('\n')
    .filter((l) => !/^# /.test(l) && !/^\| \*\*[^*]+\*\* \|/.test(l))
    .join('\n');

/**
 * The placeholders the board's template asks authors to replace, e.g.
 * `<One sentence: the outcome this task delivers.>`. Matching these exact
 * strings, rather than anything in angle brackets, keeps real content such as
 * `Array<T>` from ever counting.
 */
function placeholderSet(boardDir) {
  const path = join(boardDir, 'TEMPLATE.md');
  if (!existsSync(path)) die(`no TEMPLATE.md at ${path}`);
  return new Set((authorText(readText(path)).match(PLACEHOLDER_RE) ?? []).map(squash));
}

/** Template placeholders still in a task's authored text, in order of appearance. */
function leftoverPlaceholders(text, placeholders) {
  return (authorText(text).match(PLACEHOLDER_RE) ?? []).map(squash).filter((p) => placeholders.has(p));
}

function hasBase(text) {
  const base = readField(text, 'Base');
  return Boolean(base) && !base.startsWith('<');
}

// A list item that is only IDs (`BILL-1, BILL-2`), optionally followed by a
// comment after `(`, `—`, `-`, or `:`.
const ID_LIST_RE = /^([A-Z][A-Z0-9]*-\d+(?:\s*(?:,|&|and)\s*[A-Z][A-Z0-9]*-\d+)*)\s*(?:$|[(—:-])/;

/**
 * Task IDs named in the Dependencies section.
 *   - An item that starts with "none" names nothing, whatever it mentions.
 *   - An item that is a list of IDs names all of them, typos included, so
 *     `doctor` can report an unknown one.
 *   - Anywhere else only a registered workstream prefix makes a token an ID, so
 *     `UTF-8` or `SHA-256` in prose never blocks a task.
 */
function dependenciesOf(text, placeholders, prefixes) {
  let body = sectionBody(text, 'Dependencies');
  if (!body) return [];
  for (const p of placeholders) body = body.split(p).join(' ');
  const ids = [];
  for (const line of body.split('\n')) {
    const item = line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').trim();
    if (/^none\b/i.test(item)) continue;
    const listed = item.match(ID_LIST_RE);
    if (listed) ids.push(...listed[1].match(TASK_ID_RE));
    const rest = listed ? item.slice(listed[1].length) : item;
    for (const m of rest.matchAll(TASK_ID_RE)) {
      if (prefixes.has(m[1])) ids.push(m[0]);
    }
  }
  return [...new Set(ids)];
}

const prefixesOf = (boardDir) => new Set(readRegistry(boardDir).map((w) => w.prefix));

/**
 * Which gates this task's History waives. An `--override` move is a recorded
 * exception, so `doctor` stops reporting the gate that move bypassed — but only
 * that gate, and only until an ordinary move crosses it again.
 *
 *   ready    (placeholders, Base) — waived when the latest move into active was
 *            overridden, or when the task never entered active at all
 *   reported (Execution Report)   — waived when the latest move into the task's
 *            current stage was overridden
 */
function waivedGates(text, stage) {
  const moves = (sectionBody(text, 'History') ?? '').split('\n').filter((l) => l.includes('→'));
  const latestInto = (into) => moves.filter((l) => l.includes(`→ ${into} ·`)).at(-1) ?? null;
  const overridden = (line) => line !== null && / · override: /.test(line);
  const activation = latestInto('active');
  const entry = latestInto(stage);
  return {
    ready: activation === null ? overridden(entry) : overridden(activation),
    reported: overridden(entry),
  };
}

const isLite = (text) => readField(text, 'Complexity') === 'TRIVIAL' && !sectionRange(text, 'Definition of Ready');

/** Everything that stops a task going active. Empty means ready. */
function readinessProblems(
  boardDir,
  text,
  board = scanBoard(boardDir),
  placeholders = placeholderSet(boardDir),
  prefixes = prefixesOf(boardDir),
) {
  const problems = [];
  const lite = isLite(text);
  const missing = (lite ? LITE_SECTIONS : SECTIONS).filter((n) => !sectionRange(text, n));
  if (missing.length) problems.push(`missing section(s): ${missing.join(', ')}`);

  if (readField(text, 'Complexity') === 'EPIC') {
    problems.push('an EPIC is never executed: register a workstream and break it into STANDARD tasks');
  }

  const left = leftoverPlaceholders(text, placeholders);
  if (left.length) problems.push(`${left.length} template placeholder(s) left, e.g. "${left[0]}"`);

  if (!lite && sectionRange(text, 'Definition of Ready')) {
    // Any list marker counts, so `* [ ]` or `1. [ ]` cannot slip past.
    const boxes = sectionBody(text, 'Definition of Ready').match(/^\s*(?:[-*+]|\d+[.)])\s+\[[ xX]\]/gm) ?? [];
    const open = boxes.filter((b) => b.endsWith('[ ]')).length;
    if (!boxes.length) problems.push('Definition of Ready has no checkboxes');
    else if (open) problems.push(`Definition of Ready: ${open} of ${boxes.length} box(es) unticked`);
  }

  for (const dep of dependenciesOf(text, placeholders, prefixes)) {
    const hits = board.filter((t) => t.id === dep);
    if (!hits.length) problems.push(`dependency ${dep} is not on the board`);
    else if (!hits.some((t) => TERMINAL_STAGES.includes(t.stage))) {
      problems.push(`dependency ${dep} is in ${hits[0].stage}, not done`);
    }
  }
  return problems;
}

/* ── git ─────────────────────────────────────────────────────────────── */

function git(cwd, ...args) {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  // trimEnd, not trim: `git status --porcelain` lines start with a significant space.
  return { ok: !r.error && r.status === 0, out: (r.stdout ?? '').trimEnd(), missing: Boolean(r.error) };
}

/** The commit a task starts from, or a `none (...)` note saying why there is none. */
function gitBase(boardDir) {
  const top = git(boardDir, 'rev-parse', '--show-toplevel');
  if (top.missing) return 'none (git not found)';
  if (!top.ok) return 'none (not a git repository)';
  const head = git(boardDir, 'rev-parse', '--verify', '--quiet', 'HEAD');
  return head.ok ? head.out : 'none (no commits yet)';
}

/* ── argument parsing ────────────────────────────────────────────────── */

// Flags that take no value.
const BOOLEAN_FLAGS = new Set(['help', 'lite']);

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h') {
      flags.help = true;
    } else if (a.startsWith('--')) {
      const key = a.slice(2);
      if (BOOLEAN_FLAGS.has(key)) {
        flags[key] = true;
        continue;
      }
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) die(`--${key} needs a value`);
      flags[key] = next;
      i++;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

/* ── commands ────────────────────────────────────────────────────────── */

function cmdNew(boardDir, positional, flags) {
  const wsId = positional[0] ?? die('new needs a workstream: strix-task new <workstream> --title "..."');
  const title = (flags.title ?? die('new needs --title')).trim();
  // The title lands in a one-line markdown table cell, which a pipe or a line
  // break would split, and `readField` would then return half of it. JS also
  // treats U+2028/U+2029 as line breaks. Tabs are harmless and allowed.
  if (!title) die('new needs a non-empty --title');
  if (/[|\u0000-\u0008\u000a-\u001f\u007f\u2028\u2029]/.test(title)) {
    die('--title cannot contain "|", a line break, or a control character');
  }
  const priority = flags.priority ?? 'P2';
  if (!PRIORITIES.includes(priority)) die(`unknown --priority "${priority}" (${PRIORITIES.join(', ')})`);
  if (flags.lite && flags.complexity && flags.complexity !== 'TRIVIAL') {
    die('--lite is only for TRIVIAL tasks; drop --lite for anything bigger');
  }
  const complexity = flags.lite ? 'TRIVIAL' : (flags.complexity ?? 'STANDARD');
  if (!COMPLEXITIES.includes(complexity)) die(`unknown --complexity "${complexity}" (${COMPLEXITIES.join(', ')})`);
  if (complexity === 'EPIC') {
    die('an EPIC is never a task — register it with `strix-task workstream add`, then break it into STANDARD tasks');
  }

  const registry = readRegistry(boardDir);
  const ws = registry.find((w) => w.id === wsId);
  if (!ws) die(`unknown workstream "${wsId}" — add it with \`strix-task workstream add ${wsId} --prefix X --owner you\``);
  if (ws.status !== 'active') die(`workstream "${wsId}" is closed`);

  // Per-workstream counter, derived by scanning rather than stored: a counter
  // file would be the one line two people conflict on for every task they make.
  const taken = scanBoard(boardDir)
    .filter((t) => t.id.startsWith(`${ws.prefix}-`))
    .map((t) => Number.parseInt(t.id.slice(ws.prefix.length + 1), 10))
    .filter((n) => Number.isFinite(n));
  const id = `${ws.prefix}-${String(Math.max(0, ...taken) + 1).padStart(3, '0')}`;

  const templatePath = join(boardDir, 'TEMPLATE.md');
  if (!existsSync(templatePath)) die(`no TEMPLATE.md at ${templatePath}`);

  let text = readText(templatePath);
  // A board seeded by an older plugin lacks sections the gates now need, and
  // every task minted from it would fail them.
  const missingSections = SECTIONS.filter((n) => !sectionRange(text, n));
  if (missingSections.length) {
    const fresh = join(import.meta.dirname, '..', 'templates', 'strix', 'tasks', 'TEMPLATE.md');
    die(`${templatePath} is outdated (no ${missingSections.join(', ')} section). Refresh just the template:\n` +
      `  cp "${fresh}" "${templatePath}"\n` +
      '(`strix-init --force` also works, but it re-seeds the executor\'s config files too.)');
  }
  if (flags.lite) text = liteOf(text);
  text = text.replace(/^# <PREFIX>-<ID>: <Title>$/m, () => `# ${id}: ${title}`);
  text = setField(text, 'ID', id);
  text = setField(text, 'Workstream', wsId);
  text = setField(text, 'Title', title);
  text = setField(text, 'Priority', priority);
  text = setField(text, 'Complexity', complexity);
  text = setField(text, 'Status', STATUS_OF.queue);

  const dir = join(boardDir, 'queue', wsId);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${id}-${slugify(title)}.md`);
  if (existsSync(path)) die(`${path} already exists`);
  writeFileSync(path, text);
  console.log(path);
}

/** The template cut down to the lite sections, keeping the header and footer. */
function liteOf(text) {
  const lines = text.split('\n');
  const first = lines.findIndex((l) => l.startsWith('## '));
  const footer = lines.findLastIndex(isRule);
  const out = lines.slice(0, first);
  for (const name of LITE_SECTIONS) {
    const r = sectionRange(text, name);
    if (r) out.push(...r.lines.slice(r.start, r.end));
  }
  if (footer > first) out.push(...lines.slice(footer));
  return out.join('\n');
}

const optionalText = (flags, name) => {
  if (flags[name] === undefined) return null;
  const value = String(flags[name]).trim();
  if (!value || /[\r\n]/.test(value)) die(`--${name} needs single-line text`);
  return value;
};

function cmdMove(boardDir, positional, flags) {
  const [id, stage] = positional;
  if (!id || !stage) die('move needs an id and a stage: strix-task move <id> <stage>');
  if (!STAGES.includes(stage)) die(`unknown stage "${stage}" (${STAGES.join(', ')})`);
  const override = optionalText(flags, 'override');
  const reason = optionalText(flags, 'reason');

  const task = findTask(boardDir, id);
  if (task.stage === stage && task.workstream) {
    console.log(task.path);
    return;
  }

  const from = task.stage;
  let text = readText(task.path);
  if (!override) {
    const rule = TRANSITIONS[`${from}>${stage}`];
    if (!rule) {
      const allowed = Object.keys(TRANSITIONS).filter((k) => k.startsWith(`${from}>`)).map((k) => k.split('>')[1]);
      die(`${from} → ${stage} is not an allowed move (from ${from}: ${allowed.join(', ') || 'none'}). ` +
        'Use --override "<reason>" only if you must; it is recorded.');
    }
    if (rule.reason && !reason) die(`${from} → ${stage} needs --reason "<why>"; it is recorded in History`);
    if (rule.gate === 'ready') {
      const problems = readinessProblems(boardDir, text);
      if (problems.length) {
        die(`${id} is not ready for active (see \`strix-task check ${id}\`):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
      }
    }
    if (rule.gate === 'reported' && !sectionBody(text, 'Execution Report')) {
      die(`${id} has no Execution Report. Record the commands run, their results, and the commits first:\n` +
        `  strix-task note ${id} --section "Execution Report" --text "..."`);
    }
    if (rule.gate === 'checklist' && !sectionBody(text, 'Review Checklist')) {
      die(`${id} has no Review Checklist. Record the required changes first:\n` +
        `  strix-task note ${id} --section "Review Checklist" --text "..."`);
    }
  }

  // Base is set once, the first time the task leaves the queue for real work.
  if (STARTED_STAGES.includes(stage) && !hasBase(text)) text = setField(text, 'Base', gitBase(boardDir), 'Status');
  const why = override ? `override: ${override}` : (reason ?? '—');
  text = appendToSection(text, 'History', `- ${now()} · ${from} → ${stage} · ${actorOf(flags)} · ${why}`);

  // A loose pre-migration task keeps its place in the default bucket rather than
  // staying loose: moving it is the moment the nested layout can be restored.
  const workstream = task.workstream ?? DEFAULT_WORKSTREAM;
  const destDir = join(boardDir, stage, workstream);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, task.file);
  if (existsSync(dest)) die(`${dest} already exists`);

  renameSync(task.path, dest);
  // The Status field and the directory are one invariant; rewriting it here is
  // what stops every caller from having to remember the second half.
  text = setField(text, 'Status', STATUS_OF[stage]);
  text = setField(text, 'Workstream', workstream);
  writeFileSync(dest, text);

  pruneEmptyDir(join(boardDir, task.stage, task.workstream ?? ''));
  console.log(dest);
}

/** Remove a workstream directory that just lost its last task. */
function pruneEmptyDir(dir) {
  if (!dir || !existsSync(dir)) return;
  if (STAGES.includes(basename(dir))) return; // never prune a stage directory
  if (readdirSync(dir).length === 0) rmdirSync(dir);
}

function cmdWhere(boardDir, positional) {
  const id = positional[0] ?? die('where needs an id');
  console.log(findTask(boardDir, id).path);
}

function cmdNote(boardDir, positional, flags) {
  const id = positional[0] ?? die('note needs an id: strix-task note <id> --section "..." --text "..."');
  const name = flags.section ?? die('note needs --section');
  const stageFor = NOTE_SECTIONS[name];
  if (!stageFor) {
    die(`note writes only ${Object.keys(NOTE_SECTIONS).map((n) => `"${n}"`).join(' or ')}; edit other sections directly`);
  }
  if (flags.text !== undefined && flags.file !== undefined) die('pass --text or --file, not both');
  let body;
  if (flags.text !== undefined) body = String(flags.text);
  else if (flags.file !== undefined) body = readFileSync(flags.file === '-' ? 0 : flags.file, 'utf8');
  else die('note needs --text "..." or --file <path|->');
  // A heading or rule inside the note would end the section early, so indent
  // those lines into a code block instead of letting them restructure the file.
  body = body
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => (/^#{1,6} /.test(l) || isRule(l) ? `    ${l}` : l))
    .join('\n')
    .trim();
  if (!stripComments(body).trim()) die('note needs non-empty text');

  const task = findTask(boardDir, id);
  if (task.stage !== stageFor) {
    die(`"${name}" is written while a task is in ${stageFor}/, and ${id} is in ${task.stage}/`);
  }
  const text = readText(task.path);
  writeFileSync(task.path, appendToSection(text, name, `**${now()} · ${actorOf(flags)}**\n\n${body}`));
  console.log(task.path);
}

function cmdCheck(boardDir, positional) {
  const id = positional[0] ?? die('check needs an id');
  const task = findTask(boardDir, id);
  const problems = readinessProblems(boardDir, readText(task.path));
  if (problems.length) {
    console.log(`✗ ${id} is not ready for active:`);
    problems.forEach((p) => console.log(`  - ${p}`));
    process.exit(1);
  }
  console.log(`✓ ${id} is ready for active`);
}

function cmdNext(boardDir, flags) {
  const board = scanBoard(boardDir);
  const placeholders = placeholderSet(boardDir);
  const prefixes = prefixesOf(boardDir);
  const queued = board
    .filter((t) => t.stage === 'queue' && t.workstream)
    .filter((t) => !flags.workstream || t.workstream === flags.workstream)
    .sort((a, b) => compareIds(a.id, b.id));
  if (!queued.length) {
    console.log('(nothing queued)');
    return;
  }
  const ready = [];
  const blocked = [];
  for (const t of queued) {
    const text = readText(t.path);
    const title = readField(text, 'Title') ?? '';
    const problems = readinessProblems(boardDir, text, board, placeholders, prefixes);
    if (problems.length) blocked.push(`  ${t.id.padEnd(12)} ${title} — ${problems[0]}`);
    else ready.push(`  ${t.id.padEnd(12)} ${title}`);
  }
  console.log('ready');
  console.log(ready.length ? ready.join('\n') : '  (none)');
  if (blocked.length) console.log(`blocked\n${blocked.join('\n')}`);
}

function cmdDiff(boardDir, positional) {
  const id = positional[0] ?? die('diff needs an id');
  const task = findTask(boardDir, id);
  const top = git(boardDir, 'rev-parse', '--show-toplevel');
  if (!top.ok) die('diff needs the task board to be inside a git repository');
  const base = readField(readText(task.path), 'Base') ?? '';
  const range = /^[0-9a-f]{7,64}$/.test(base) ? [`${base}..HEAD`] : ['HEAD'];

  const log = spawnSync(
    'git',
    ['-C', top.out, 'log', '--reverse', '-p', '--format=commit %H%n%s%n', `--grep=^Strix-Task: ${id}$`, ...range, '--'],
    { encoding: 'utf8' },
  );
  if (log.status !== 0) die(`git log failed: ${(log.stderr ?? '').trim()}`);
  console.log(log.stdout.trim() || `(no commits with a "Strix-Task: ${id}" trailer in ${range[0]})`);

  // Work that never reached a commit is invisible above, so say so. The board's
  // own directory is excluded: moves and notes change it all the time.
  const strixDir = relative(realpathSync(top.out), realpathSync(resolve(boardDir, '..')));
  // -z gives raw paths (no C-quoting); a rename's source follows as its own record.
  const status = spawnSync('git', ['-C', top.out, '-c', 'core.quotePath=false', 'status', '--porcelain', '-z', '--untracked-files=all'], {
    encoding: 'utf8',
  });
  const records = (status.stdout ?? '').split('\0');
  const dirty = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r) continue;
    const paths = [r.slice(3)];
    if (/^[RC]/.test(r)) paths.push(records[++i]);
    const inBoard = (p) => p === strixDir || p.startsWith(`${strixDir}/`);
    if (!paths.every(inBoard)) dirty.push(`${r.slice(0, 3)}${paths.join(' <- ')}`);
  }
  if (dirty.length) {
    console.error(`warning: uncommitted changes are not part of this diff:\n${dirty.map((l) => `  ${l}`).join('\n')}`);
  }
}

function cmdLs(boardDir, flags) {
  const registry = readRegistry(boardDir);
  const ownerOf = Object.fromEntries(registry.map((w) => [w.id, w.owner]));

  let tasks = scanBoard(boardDir);
  if (flags.workstream) tasks = tasks.filter((t) => t.workstream === flags.workstream);
  if (flags.stage) tasks = tasks.filter((t) => t.stage === flags.stage);
  if (flags.owner) tasks = tasks.filter((t) => ownerOf[t.workstream] === flags.owner);

  if (tasks.length === 0) {
    console.log('(no tasks)');
    return;
  }

  const groups = new Map();
  for (const t of tasks) {
    const key = t.workstream ?? '(unfiled)';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  for (const [ws, items] of [...groups].sort()) {
    const owner = ownerOf[ws] ? ` (${ownerOf[ws]})` : '';
    console.log(`${ws}${owner}`);
    for (const t of items.sort((a, b) => compareIds(a.id, b.id))) {
      const title = readField(readText(t.path), 'Title') ?? '';
      console.log(`  ${t.stage.padEnd(7)} ${t.id.padEnd(12)} ${title}`);
    }
  }
}

function cmdWorkstream(boardDir, positional, flags) {
  const [sub, id] = positional;
  if (!sub || !id) die('workstream needs a subcommand and an id: add <id> | close <id>');
  const registry = readRegistry(boardDir);

  if (sub === 'add') {
    const prefix = flags.prefix ?? die('workstream add needs --prefix');
    const owner = flags.owner ?? die('workstream add needs --owner');
    if (!/^[a-z][a-z0-9-]*$/.test(id)) die(`workstream id "${id}" must be lowercase kebab-case`);
    if (!/^[A-Z][A-Z0-9]*$/.test(prefix)) die(`prefix "${prefix}" must be uppercase`);
    // The registry reader drops `# comments` and reads one line per value.
    if (!owner.trim() || /[#\r\n]/.test(owner)) die(`owner "${owner}" cannot contain "#" or a line break`);
    if (registry.some((w) => w.id === id)) die(`workstream "${id}" already exists`);
    // A shared prefix would mean an ID no longer names one workstream, which is
    // the entire point of prefixing them.
    const clash = registry.find((w) => w.prefix === prefix);
    if (clash) die(`prefix "${prefix}" is already used by "${clash.id}"`);
    registryAppend(boardDir, { id, prefix, owner: owner.trim(), status: 'active' });
    console.log(`added workstream ${id} (${prefix}), owner ${owner}`);
    return;
  }

  if (sub === 'close') {
    const ws = registry.find((w) => w.id === id);
    if (!ws) die(`unknown workstream "${id}"`);
    if (id === DEFAULT_WORKSTREAM) die(`"${DEFAULT_WORKSTREAM}" is the default bucket and cannot be closed`);
    const live = scanBoard(boardDir).filter(
      (t) => t.workstream === id && !TERMINAL_STAGES.includes(t.stage),
    );
    if (live.length) {
      die(`workstream "${id}" still has ${live.length} live task(s): ${live.map((t) => t.id).join(', ')}`);
    }
    registrySetStatus(boardDir, id, 'closed');
    console.log(`closed workstream ${id}`);
    return;
  }

  die(`unknown workstream subcommand "${sub}" (add, close)`);
}

function cmdDoctor(boardDir) {
  const registry = readRegistry(boardDir);
  const byId = Object.fromEntries(registry.map((w) => [w.id, w]));
  const problems = [];
  const board = scanBoard(boardDir);
  const placeholders = placeholderSet(boardDir);

  for (const w of registry) {
    if (!REGISTRY_STATUSES.includes(w.status)) {
      problems.push(`${REGISTRY}: workstream "${w.id}" has status "${w.status}" (${REGISTRY_STATUSES.join(' or ')})`);
    }
  }

  // Every ID names one task.
  const places = new Map();
  for (const t of board) places.set(t.id, [...(places.get(t.id) ?? []), t.path.replace(`${boardDir}/`, '')]);
  for (const [id, paths] of places) {
    if (paths.length > 1) problems.push(`${id}: duplicate id, in ${paths.length} places: ${paths.join(', ')}`);
  }

  const dependsOn = new Map();
  for (const task of board) {
    const at = task.path.replace(`${boardDir}/`, '');
    const text = readText(task.path);

    if (task.workstream === null) {
      problems.push(`${at}: loose task, not in a workstream directory — run \`strix-task migrate\``);
      continue;
    }

    // 1. Status field agrees with the stage directory.
    const status = readField(text, 'Status');
    if (status !== STATUS_OF[task.stage]) {
      problems.push(`${at}: Status is "${status}" but it sits in ${task.stage}/ (expected "${STATUS_OF[task.stage]}")`);
    }

    // 2. Workstream field agrees with the parent directory.
    const declared = readField(text, 'Workstream');
    if (declared !== task.workstream) {
      problems.push(`${at}: Workstream field is "${declared}" but it sits in ${task.workstream}/`);
    }

    const ws = byId[task.workstream];
    // 4. The workstream is registered, and active unless the task is finished.
    if (!ws) {
      problems.push(`${at}: workstream "${task.workstream}" is not in ${REGISTRY}`);
      continue;
    }
    if (ws.status !== 'active' && !TERMINAL_STAGES.includes(task.stage)) {
      problems.push(`${at}: workstream "${ws.id}" is ${ws.status} but this task is still live in ${task.stage}/`);
    }

    // 3. The ID prefix matches the workstream's registered prefix.
    if (!task.id.startsWith(`${ws.prefix}-`)) {
      problems.push(`${at}: id "${task.id}" does not carry workstream "${ws.id}" prefix "${ws.prefix}-"`);
    }
  }

  // Content checks, for every filed task.
  for (const task of board.filter((t) => t.workstream !== null)) {
    const at = task.path.replace(`${boardDir}/`, '');
    const text = readText(task.path);

    const header = readField(text, 'ID');
    if (header !== task.id) problems.push(`${at}: header ID is "${header}" but the filename says "${task.id}"`);

    if (readField(text, 'Complexity') === 'EPIC') {
      problems.push(`${at}: an EPIC is on the board; register a workstream and break it into STANDARD tasks`);
    }

    const deps = dependenciesOf(text, placeholders, new Set(registry.map((w) => w.prefix)));
    dependsOn.set(task.id, deps);
    for (const dep of deps) {
      if (!places.has(dep)) problems.push(`${at}: depends on unknown task ${dep}`);
    }

    const waived = waivedGates(text, task.stage);
    if (STARTED_STAGES.includes(task.stage) && !waived.ready) {
      const left = leftoverPlaceholders(text, placeholders);
      if (left.length) problems.push(`${at}: ${left.length} template placeholder(s) left past the queue, e.g. "${left[0]}"`);
      if (!hasBase(text)) problems.push(`${at}: no Base recorded (strix-task move sets it on the way to active)`);
    }
    if (['review', 'done'].includes(task.stage) && !waived.reported && !sectionBody(text, 'Execution Report')) {
      problems.push(`${at}: Execution Report is empty in ${task.stage}/`);
    }
  }

  // Dependency cycles: a task can never become ready inside one.
  const seen = new Set();
  const reported = new Set();
  const walk = (id, trail) => {
    if (trail.includes(id)) {
      const cycle = [...trail.slice(trail.indexOf(id)), id];
      const key = [...cycle].slice(0, -1).sort().join(',');
      if (!reported.has(key)) {
        reported.add(key);
        problems.push(`dependency cycle: ${cycle.join(' → ')}`);
      }
      return;
    }
    if (seen.has(id)) return;
    for (const dep of dependsOn.get(id) ?? []) walk(dep, [...trail, id]);
    seen.add(id);
  };
  for (const id of dependsOn.keys()) walk(id, []);

  if (problems.length) {
    console.error(`✗ ${problems.length} board problem(s):`);
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  console.log('✓ board valid: status, workstream, prefix, registry, ids, dependencies, placeholders, base, reports');
}

function cmdMigrate(boardDir) {
  if (!existsSync(join(boardDir, REGISTRY))) {
    seedRegistry(boardDir);
    console.log(`created ${REGISTRY}`);
  }

  const loose = scanBoard(boardDir).filter((t) => t.workstream === null);
  for (const task of loose) {
    const destDir = join(boardDir, task.stage, DEFAULT_WORKSTREAM);
    mkdirSync(destDir, { recursive: true });
    const dest = join(destDir, task.file);
    if (existsSync(dest)) die(`${dest} already exists; resolve by hand`);
    // A plain rename, with no ID change: `general` uses the TASK prefix precisely
    // so existing `Dependencies: TASK-012` references keep resolving.
    renameSync(task.path, dest);
    writeFileSync(dest, setField(readText(dest), 'Workstream', DEFAULT_WORKSTREAM));
    console.log(`moved ${task.file} → ${task.stage}/${DEFAULT_WORKSTREAM}/`);
  }
  if (loose.length === 0) console.log('no loose tasks to migrate');

  cmdDoctor(boardDir);
}

/* ── entry ───────────────────────────────────────────────────────────── */

const USAGE = `strix-task — manage a Strix task board

  new <workstream> --title "..." [--complexity C] [--priority P] [--lite]
  move <id> <stage> [--reason "..."] [--override "..."] [--by who]
                               stages: ${STAGES.join(', ')}
  note <id> --section "Execution Report"|"Review Checklist" (--text "..." | --file <path|->)
  check <id>                   is the task ready to go active?
  next [--workstream w]        queued tasks, ready first
  diff <id>                    the task's Strix-Task commits since its Base
  where <id>
  ls [--workstream w] [--stage s] [--owner o]
  workstream add <id> --prefix P --owner O
  workstream close <id>
  doctor
  migrate

  --board <dir>                defaults to <cwd>/.strix/tasks
  -h, --help                   show this help

  Allowed moves (anything else needs --override "<reason>", which is recorded):
${Object.entries(TRANSITIONS)
  .map(([k, r]) => `    ${k.replace('>', ' → ').padEnd(18)}${r.gate ? `gate: ${r.gate}` : ''}${r.reason ? 'needs --reason' : ''}`)
  .join('\n')}
    gates: ready = no placeholders, Definition of Ready ticked, dependencies done;
           reported = Execution Report filled; checklist = Review Checklist filled
  --lite: a TRIVIAL task with only ${LITE_SECTIONS.join(', ')}

  --priority: ${PRIORITIES.join(', ')} (default P2)
  --complexity: ${COMPLEXITIES.filter((c) => c !== 'EPIC').join(', ')} (default STANDARD);
    an EPIC becomes a workstream plus STANDARD tasks, never a task itself`;

const { positional, flags } = parseArgs(process.argv.slice(2));
const command = positional.shift();

if (!command || command === 'help' || flags.help) {
  console.log(USAGE);
  process.exit(command || flags.help ? 0 : 2);
}

const boardDir = resolve(flags.board ?? join(process.cwd(), '.strix', 'tasks'));
if (!existsSync(boardDir)) die(`no task board at ${boardDir} (pass --board <dir>)`);

switch (command) {
  case 'new': cmdNew(boardDir, positional, flags); break;
  case 'move': cmdMove(boardDir, positional, flags); break;
  case 'note': cmdNote(boardDir, positional, flags); break;
  case 'check': cmdCheck(boardDir, positional); break;
  case 'next': cmdNext(boardDir, flags); break;
  case 'diff': cmdDiff(boardDir, positional); break;
  case 'where': cmdWhere(boardDir, positional); break;
  case 'ls': cmdLs(boardDir, flags); break;
  case 'workstream': cmdWorkstream(boardDir, positional, flags); break;
  case 'doctor': cmdDoctor(boardDir); break;
  case 'migrate': cmdMigrate(boardDir); break;
  default:
    console.error(`strix-task: unknown command "${command}"\n\n${USAGE}`);
    process.exit(2);
}
