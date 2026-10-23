#!/usr/bin/env node
/**
 * Smoke test for bin/strix-task.
 *
 * Builds a throwaway board in a temp directory, drives it through the real CLI,
 * and asserts that `doctor` catches each of the four board invariants when they
 * are deliberately broken. Zero dependencies, like the tool it tests.
 *
 *   node scripts/test-strix-task.mjs
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './lib/config.mjs';

// The implementation is an explicit ES module so it never depends on Node's
// syntax detection; `bin/strix-task` is the bash entry point that runs it.
const CLI = join(ROOT, 'bin', 'strix-task.mjs');
const WRAPPER = join(ROOT, 'bin', 'strix-task');
const STAGES = ['queue', 'active', 'review', 'done', 'archive'];

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks++;
  if (condition) return;
  failures++;
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
}

/** Run the CLI against a board; never throws, so failures can be asserted. */
function run(board, ...args) {
  const r = spawnSync(process.execPath, [CLI, '--board', board, ...args], {
    encoding: 'utf8',
    env: { ...process.env, STRIX_ACTOR: 'tester' },
  });
  return { code: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

/**
 * Fill a freshly minted task the way task-creator-agent would: every body
 * placeholder replaced, the Definition of Ready ticked, and Dependencies set.
 * The header table is left alone; the CLI owns it.
 */
function makeReady(path, { deps = 'none' } = {}) {
  const text = readFileSync(path, 'utf8');
  const cut = text.indexOf('\n## ');
  let body = text.slice(cut).replace(/<(?!!--)[^<>]+>/g, 'filled');
  body = body.replace(/(## Dependencies\n\n)[\s\S]*?(\n## )/, `$1- ${deps}\n$2`);
  body = body.replace(/(## Definition of Ready[^\n]*\n)([\s\S]*?)(\n## )/, (_m, h, b, t) => h + b.replaceAll('- [ ]', '- [x]') + t);
  // The comments above the new sections hold <ID> too; restore them untouched.
  const original = text.slice(cut);
  const comments = original.match(/<!--[\s\S]*?-->/g) ?? [];
  let i = 0;
  body = body.replace(/<!--[\s\S]*?-->/g, () => comments[i++]);
  writeFileSync(path, text.slice(0, cut) + body);
  return path;
}

/** New task, filled and moved to active. Returns the active path. */
function activeTask(board, ws, title, opts) {
  const created = run(board, 'new', ws, '--title', title);
  makeReady(created.out, opts);
  const id = /([A-Z][A-Z0-9]*-\d+)-/.exec(created.out)[1];
  const moved = run(board, 'move', id, 'active');
  if (moved.code !== 0) throw new Error(`could not activate ${id}: ${moved.err}`);
  return { id, path: moved.out };
}

/** Walk a task from active to done through the real gates. */
function finish(board, id) {
  run(board, 'note', id, '--section', 'Execution Report', '--text', 'npm test → exit 0');
  run(board, 'move', id, 'review');
  return run(board, 'move', id, 'done');
}

const section = (text, name) => {
  const m = new RegExp(`\n## ${name}[^\n]*\n([\\s\\S]*?)(?=\n## |\n---\n|$)`).exec(text);
  return m ? m[1].replace(/<!--[\s\S]*?-->/g, '').trim() : null;
};

/** A fresh board seeded from the plugin's own templates. */
function makeBoard() {
  const board = join(mkdtempSync(join(tmpdir(), 'strix-task-')), 'tasks');
  mkdirSync(board, { recursive: true });
  const seed = join(ROOT, 'templates', 'strix', 'tasks');
  cpSync(join(seed, 'TEMPLATE.md'), join(board, 'TEMPLATE.md'));
  cpSync(join(seed, 'workstreams.yaml'), join(board, 'workstreams.yaml'));
  for (const s of STAGES) mkdirSync(join(board, s), { recursive: true });
  return board;
}

const boards = [];
const newBoard = () => {
  const b = makeBoard();
  boards.push(b);
  return b;
};

/* ── happy path: new → move → where → ls → doctor ────────────────────── */

console.log('happy path');
{
  const board = newBoard();

  const added = run(board, 'workstream', 'add', 'billing-system', '--prefix', 'BILL', '--owner', 'quan');
  check('workstream add succeeds', added.code === 0, added.err);

  const created = run(board, 'new', 'billing-system', '--title', 'Add invoice model');
  check('new succeeds', created.code === 0, created.err);
  check('new mints a prefixed id in the workstream directory',
    created.out.endsWith(join('queue', 'billing-system', 'BILL-001-add-invoice-model.md')), created.out);

  const body = readFileSync(created.out, 'utf8');
  check('new fills the Workstream field', /\| \*\*Workstream\*\* \| billing-system \|/.test(body));
  check('new fills the title heading', body.startsWith('# BILL-001: Add invoice model'));
  check('new starts the task Queued', /\| \*\*Status\*\* \| Queued \|/.test(body));

  // Per-workstream counters are independent: a second workstream restarts at 001.
  run(board, 'workstream', 'add', 'search-revamp', '--prefix', 'SRCH', '--owner', 'colleague');
  const other = run(board, 'new', 'search-revamp', '--title', 'Reindex nightly');
  check('a second workstream has its own counter',
    other.out.endsWith('SRCH-001-reindex-nightly.md'), other.out);

  const second = run(board, 'new', 'billing-system', '--title', 'Add invoice API');
  check('the counter advances within a workstream',
    second.out.endsWith('BILL-002-add-invoice-api.md'), second.out);

  makeReady(created.out);
  const moved = run(board, 'move', 'BILL-001', 'active');
  check('move succeeds', moved.code === 0, moved.err);
  check('move keeps the task in its workstream',
    moved.out.endsWith(join('active', 'billing-system', 'BILL-001-add-invoice-model.md')), moved.out);
  check('move rewrites the Status field',
    /\| \*\*Status\*\* \| In Progress \|/.test(readFileSync(moved.out, 'utf8')));

  check('the filename keeps the board\'s kebab-title convention',
    /BILL-001-add-invoice-model\.md$/.test(created.out), created.out);

  const where = run(board, 'where', 'BILL-001');
  check('where finds a task without a hand-built path', where.out === moved.out, where.out);

  const listed = run(board, 'ls');
  check('ls groups by workstream', listed.out.includes('billing-system (quan)'), listed.out);
  check('ls shows titles', listed.out.includes('Add invoice model'), listed.out);

  const filtered = run(board, 'ls', '--owner', 'colleague');
  check('ls --owner filters', filtered.out.includes('SRCH-001') && !filtered.out.includes('BILL-001'), filtered.out);

  check('doctor passes on a clean board', run(board, 'doctor').code === 0);
}

/* ── directories appear and vanish with their tasks ──────────────────── */

console.log('directory lifecycle');
{
  const board = newBoard();
  run(board, 'workstream', 'add', 'billing-system', '--prefix', 'BILL', '--owner', 'quan');
  activeTask(board, 'billing-system', 'Only task');

  const r = spawnSync(process.execPath, ['-e', `process.exit(require('fs').existsSync(${JSON.stringify(join(board, 'queue', 'billing-system'))}) ? 1 : 0)`]);
  check('the source workstream directory is pruned once empty', r.status === 0);
}

/* ── the four invariants, each broken on its own board ───────────────── */

console.log('doctor catches each broken invariant');
{
  /** A board with one clean task in billing-system/active. */
  const seeded = () => {
    const board = newBoard();
    run(board, 'workstream', 'add', 'billing-system', '--prefix', 'BILL', '--owner', 'quan');
    const path = run(board, 'new', 'billing-system', '--title', 'Seed').out;
    return { board, path };
  };

  // 1. Status field vs stage directory.
  {
    const { board, path } = seeded();
    writeFileSync(path, readFileSync(path, 'utf8').replace('| **Status** | Queued |', '| **Status** | Done |'));
    const r = run(board, 'doctor');
    check('invariant 1: Status disagreeing with the stage fails', r.code === 1, r.out);
    check('invariant 1: the message names the mismatch', /Status is "Done"/.test(r.err), r.err);
  }

  // 2. Workstream field vs parent directory.
  {
    const { board, path } = seeded();
    writeFileSync(path, readFileSync(path, 'utf8').replace('| **Workstream** | billing-system |', '| **Workstream** | search-revamp |'));
    const r = run(board, 'doctor');
    check('invariant 2: Workstream field disagreeing with the directory fails', r.code === 1, r.out);
    check('invariant 2: the message names the field', /Workstream field is "search-revamp"/.test(r.err), r.err);
  }

  // 3. ID prefix vs the workstream's registered prefix.
  {
    const { board, path } = seeded();
    const renamed = join(board, 'queue', 'billing-system', 'WRONG-001-seed.md');
    renameSync(path, renamed);
    writeFileSync(renamed, readFileSync(renamed, 'utf8').replace('| **ID** | BILL-001 |', '| **ID** | WRONG-001 |'));
    const r = run(board, 'doctor');
    check('invariant 3: a foreign id prefix fails', r.code === 1, r.out);
    check('invariant 3: the message names the expected prefix', /prefix "BILL-"/.test(r.err), r.err);
  }

  // 4. Workstream must be registered, and active while the task is live.
  {
    const { board, path } = seeded();
    const stray = join(board, 'queue', 'ghost-stream');
    mkdirSync(stray, { recursive: true });
    renameSync(path, join(stray, 'BILL-001-seed.md'));
    const r = run(board, 'doctor');
    check('invariant 4: an unregistered workstream fails', r.code === 1, r.out);
    check('invariant 4: the message names the registry', /is not in workstreams\.yaml/.test(r.err), r.err);
  }

  // 4b. A closed workstream may keep finished tasks but not live ones.
  {
    const { board, path } = seeded();
    makeReady(path);
    run(board, 'move', 'BILL-001', 'active');
    finish(board, 'BILL-001');
    const closed = run(board, 'workstream', 'close', 'billing-system');
    check('a workstream with only finished tasks can be closed', closed.code === 0, closed.err);
    check('doctor still passes with a closed workstream holding done work', run(board, 'doctor').code === 0);

    const reopened = run(board, 'move', 'BILL-001', 'active', '--reason', 'regression found');
    check('moving a done task back out of a closed workstream is caught', run(board, 'doctor').code === 1, reopened.out);
  }

  // `close` refuses while live work remains, so that state is hard to reach.
  {
    const { board } = seeded();
    const r = run(board, 'workstream', 'close', 'billing-system');
    check('close refuses while a task is still live', r.code === 1, r.out);
    check('close names the blocking task', /BILL-001/.test(r.err), r.err);
  }
}

/* ── migration from a flat board ─────────────────────────────────────── */

console.log('migrate');
{
  const board = newBoard();
  rmSync(join(board, 'workstreams.yaml'));

  // A pre-nesting board: loose TASK-<n>.md files, no Workstream field.
  const legacy = readFileSync(join(ROOT, 'templates', 'strix', 'tasks', 'TEMPLATE.md'), 'utf8')
    .replace('| **ID** | <PREFIX>-<ID> |', '| **ID** | TASK-012 |')
    .replace(/\| \*\*Workstream\*\* \| <workstream-id> \|\n/, '')
    .replace('| **Status** | Queued \\| In Progress \\| In Review \\| Done \\| Archived |', '| **Status** | Queued |');
  writeFileSync(join(board, 'queue', 'TASK-012.md'), legacy);

  const r = run(board, 'migrate');
  check('migrate succeeds on a flat board', r.code === 0, r.err);

  const migrated = join(board, 'queue', 'general', 'TASK-012.md');
  const text = readFileSync(migrated, 'utf8');
  check('migrate keeps the original id', /\| \*\*ID\*\* \| TASK-012 \|/.test(text));
  check('migrate adds the Workstream field', /\| \*\*Workstream\*\* \| general \|/.test(text));
  check('migrate leaves the board healthy', run(board, 'doctor').code === 0);

  const again = run(board, 'migrate');
  check('migrate is idempotent', again.code === 0 && again.out.includes('no loose tasks'), again.out);
}

/* ── the registry reader refuses to guess ────────────────────────────── */

console.log('registry reader');
{
  const board = newBoard();
  writeFileSync(join(board, 'workstreams.yaml'), 'workstreams:\n  - id: general\n    prefix: TASK\n    owner: shared\n    status: active\n    extra:\n      nested: true\n');
  const r = run(board, 'doctor');
  check('nested registry syntax is rejected rather than mis-parsed', r.code === 1, r.out);
  check('the rejection explains the constraint', /must stay flat/.test(r.err), r.err);
}

/* ── help needs no board and no flag value ───────────────────────────── */

console.log('help');
{
  /** Run the CLI with no --board, from a directory that has no board either. */
  const bare = (...args) => {
    const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', cwd: tmpdir() });
    return { code: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
  };
  for (const flag of ['--help', '-h', 'help']) {
    const r = bare(flag);
    check(`${flag} prints usage and exits 0`, r.code === 0 && r.out.includes('manage a Strix task board'), r.err);
  }
  const sub = bare('new', '--help');
  check('--help after a command still prints usage', sub.code === 0 && sub.out.includes('manage a Strix task board'), sub.err);
  const none = bare();
  check('no command prints usage and exits 2', none.code === 2 && none.out.includes('manage a Strix task board'), none.err);

  const viaWrapper = spawnSync(WRAPPER, ['--help'], { encoding: 'utf8', cwd: tmpdir() });
  check('the bin/strix-task wrapper runs the module', viaWrapper.status === 0 && viaWrapper.stdout.includes('manage a Strix task board'),
    `${viaWrapper.status} ${viaWrapper.stderr}`);
}

/* ── user text is data, never a replacement pattern ──────────────────── */

console.log('title handling');
{
  const board = newBoard();
  // Each of these is a special pattern in String.prototype.replace.
  const titles = ['Fix price $1 and $& bug', 'Keep $` before', "Keep $' after", 'Literal $$ sign', 'Tab\tis fine'];
  for (const title of titles) {
    const r = run(board, 'new', 'general', '--title', title);
    check(`new accepts ${JSON.stringify(title)}`, r.code === 0, r.err);
    if (r.code !== 0) continue;
    const text = readFileSync(r.out, 'utf8');
    check(`heading keeps ${JSON.stringify(title)} verbatim`, text.split('\n')[0].endsWith(`: ${title}`), text.split('\n')[0]);
    check(`Title field keeps ${JSON.stringify(title)} verbatim`, text.includes(`| **Title** | ${title} |`), text.slice(0, 400));
  }

  for (const [label, title] of [
    ['a pipe', 'Split a | b'],
    ['a newline', 'Line one\nLine two'],
    ['a carriage return', 'Line one\rLine two'],
    ['only whitespace', '   '],
    ['a unicode line separator', 'Line one\u2028Line two'],
    ['a unicode paragraph separator', 'Line one\u2029Line two'],
    ['a control character', 'Bell \u0007 here'],
  ]) {
    const r = run(board, 'new', 'general', '--title', title);
    check(`new rejects a title with ${label}`, r.code === 1 && /title/i.test(r.err), `${r.code} ${r.err}`);
  }

  // A hand-edited legacy ID cell must survive the Workstream row being inserted.
  const legacyBoard = newBoard();
  const legacy = readFileSync(join(ROOT, 'templates', 'strix', 'tasks', 'TEMPLATE.md'), 'utf8')
    .replace('| **ID** | <PREFIX>-<ID> |', () => "| **ID** | TASK-012 ($& $') |")
    .replace(/\| \*\*Workstream\*\* \| <workstream-id> \|\n/, '')
    .replace('| **Status** | Queued \\| In Progress \\| In Review \\| Done \\| Archived |', '| **Status** | Queued |');
  writeFileSync(join(legacyBoard, 'queue', 'TASK-012.md'), legacy);
  run(legacyBoard, 'migrate');
  const migrated = readFileSync(join(legacyBoard, 'queue', 'general', 'TASK-012.md'), 'utf8');
  check('inserting a field leaves a $-bearing ID row intact',
    migrated.includes("| **ID** | TASK-012 ($& $') |\n| **Workstream** | general |"), migrated.slice(0, 400));
}

/* ── header enums ────────────────────────────────────────────────────── */

console.log('header enums');
{
  const board = newBoard();
  const ok = run(board, 'new', 'general', '--title', 'Valid enums', '--priority', 'P0', '--complexity', 'SIMPLE');
  check('new accepts a valid priority and complexity', ok.code === 0, ok.err);
  if (ok.code === 0) {
    const text = readFileSync(ok.out, 'utf8');
    check('new records the priority', text.includes('| **Priority** | P0 |'));
    check('new records the complexity', text.includes('| **Complexity** | SIMPLE |'));
  }

  const badPriority = run(board, 'new', 'general', '--title', 'x', '--priority', 'P9');
  check('new rejects an unknown priority', badPriority.code === 1 && /priority/.test(badPriority.err), badPriority.err);

  const badComplexity = run(board, 'new', 'general', '--title', 'x', '--complexity', 'HUGE');
  check('new rejects an unknown complexity', badComplexity.code === 1 && /complexity/.test(badComplexity.err), badComplexity.err);

  const epic = run(board, 'new', 'general', '--title', 'x', '--complexity', 'EPIC');
  check('new refuses to mint an EPIC task', epic.code === 1 && /EPIC/.test(epic.err) && /workstream/.test(epic.err), epic.err);
  check('a rejected new writes nothing', run(board, 'ls').out.split('\n').filter((l) => /TASK-/.test(l)).length === 1);
}

/* ── the transition graph and its gates ──────────────────────────────── */

console.log('transitions');
{
  const board = newBoard();
  const fresh = run(board, 'new', 'general', '--title', 'Gated task').out;

  const early = run(board, 'move', 'TASK-001', 'active');
  check('an unfilled task cannot go active', early.code === 1 && /placeholder/.test(early.err), early.err);
  check('the refusal quotes a leftover placeholder', early.err.includes('<One sentence'), early.err);

  makeReady(fresh);
  writeFileSync(fresh, readFileSync(fresh, 'utf8').replace('- [x] Acceptance Criteria are testable', '- [ ] Acceptance Criteria are testable'));
  const unticked = run(board, 'move', 'TASK-001', 'active');
  check('an unticked Definition of Ready blocks the move', unticked.code === 1 && /Definition of Ready/.test(unticked.err), unticked.err);
  makeReady(fresh);

  const skip = run(board, 'move', 'TASK-001', 'done');
  check('queue → done is not a transition', skip.code === 1 && /queue → done/.test(skip.err) && /--override/.test(skip.err), skip.err);

  const ok = run(board, 'move', 'TASK-001', 'active');
  check('a ready task goes active', ok.code === 0, ok.err);
  const text = readFileSync(ok.out, 'utf8');
  check('the move records Base outside a git repo', /\| \*\*Base\*\* \| none \(not a git repository\) \|/.test(text), text.slice(0, 900));
  check('the move appends History with the actor', /^- \S+Z · queue → active · tester · —$/m.test(section(text, 'History')), section(text, 'History'));

  const unreported = run(board, 'move', 'TASK-001', 'review');
  check('review needs an Execution Report', unreported.code === 1 && /Execution Report/.test(unreported.err), unreported.err);

  const wrongNote = run(board, 'note', 'TASK-001', '--section', 'Review Checklist', '--text', 'x');
  check('a Review Checklist note is refused outside review', wrongNote.code === 1 && /review/.test(wrongNote.err), wrongNote.err);
  const badSection = run(board, 'note', 'TASK-001', '--section', 'Goal', '--text', 'x');
  check('note refuses a section it does not own', badSection.code === 1 && /Execution Report/.test(badSection.err), badSection.err);
  const emptyNote = run(board, 'note', 'TASK-001', '--section', 'Execution Report', '--text', '  ');
  check('note refuses empty text', emptyNote.code === 1, emptyNote.err);

  const noted = run(board, 'note', 'TASK-001', '--section', 'Execution Report', '--text', 'npm test → exit 0\nabc123 Strix-Task: TASK-001');
  check('note fills the Execution Report', noted.code === 0 && section(readFileSync(ok.out, 'utf8'), 'Execution Report').includes('abc123'), noted.err);
  check('note leaves the other sections alone', section(readFileSync(ok.out, 'utf8'), 'Review Checklist') === '');

  const reviewed = run(board, 'move', 'TASK-001', 'review', '--by', 'executor');
  check('a reported task goes to review', reviewed.code === 0, reviewed.err);
  check('--by names the actor', /· active → review · executor ·/.test(readFileSync(reviewed.out, 'utf8')));

  const bounce = run(board, 'move', 'TASK-001', 'active');
  check('returning to active needs a Review Checklist', bounce.code === 1 && /Review Checklist/.test(bounce.err), bounce.err);
  const lateReport = run(board, 'note', 'TASK-001', '--section', 'Execution Report', '--text', 'x');
  check('an Execution Report note is refused outside active', lateReport.code === 1, lateReport.err);
  run(board, 'note', 'TASK-001', '--section', 'Review Checklist', '--text', '- [ ] Rename the helper');
  check('a checklist lets the task return to active', run(board, 'move', 'TASK-001', 'active').code === 0);
  check('Base survives a second activation', /none \(not a git repository\)/.test(readFileSync(run(board, 'where', 'TASK-001').out, 'utf8')));

  run(board, 'move', 'TASK-001', 'review');
  check('review → done is allowed', run(board, 'move', 'TASK-001', 'done').code === 0);
  const reopen = run(board, 'move', 'TASK-001', 'active');
  check('reopening needs a reason', reopen.code === 1 && /--reason/.test(reopen.err), reopen.err);
  check('reopening with a reason works', run(board, 'move', 'TASK-001', 'active', '--reason', 'flaky').code === 0);
  const escalate = run(board, 'move', 'TASK-001', 'queue', '--reason', 'needs an ADR first');
  check('escalating back to queue with a reason works', escalate.code === 0, escalate.err);
  check('the reason lands in History', /· active → queue · tester · needs an ADR first$/m.test(readFileSync(escalate.out, 'utf8')));

  run(board, 'new', 'general', '--title', 'Cancel me');
  const cancel = run(board, 'move', 'TASK-002', 'archive');
  check('cancelling needs a reason', cancel.code === 1 && /--reason/.test(cancel.err), cancel.err);
  check('cancelling with a reason works', run(board, 'move', 'TASK-002', 'archive', '--reason', 'duplicate').code === 0);

  run(board, 'new', 'general', '--title', 'Forced');
  const forced = run(board, 'move', 'TASK-003', 'review', '--override', 'imported from another tracker');
  check('--override bypasses the graph', forced.code === 0, forced.err);
  check('--override is recorded', /· queue → review · tester · override: imported from another tracker$/m.test(readFileSync(forced.out, 'utf8')));
  const emptyOverride = run(board, 'move', 'TASK-003', 'done', '--override', ' ');
  check('--override needs a real reason', emptyOverride.code === 1, emptyOverride.err);

  const same = run(board, 'move', 'TASK-003', 'review');
  check('moving to the current stage is a no-op', same.code === 0 && !/review → review/.test(readFileSync(same.out, 'utf8')));
}

console.log('dependencies');
{
  const board = newBoard();
  run(board, 'workstream', 'add', 'billing', '--prefix', 'BILL', '--owner', 'quan');
  const first = run(board, 'new', 'billing', '--title', 'First').out;
  const second = run(board, 'new', 'billing', '--title', 'Second').out;
  makeReady(first);
  makeReady(second, { deps: 'BILL-001 (the model)' });

  const blocked = run(board, 'move', 'BILL-002', 'active');
  check('a task waits for its dependency', blocked.code === 1 && /BILL-001/.test(blocked.err) && /queue/.test(blocked.err), blocked.err);

  const nextBefore = run(board, 'next');
  check('next lists the ready task', /BILL-001/.test(nextBefore.out), nextBefore.out);
  check('next lists the blocked task as blocked', /blocked[\s\S]*BILL-002/.test(nextBefore.out), nextBefore.out);
  check('next --workstream filters', !/BILL/.test(run(board, 'next', '--workstream', 'general').out));

  run(board, 'move', 'BILL-001', 'active');
  finish(board, 'BILL-001');
  check('a Done dependency unblocks the task', run(board, 'move', 'BILL-002', 'active').code === 0);

  const third = run(board, 'new', 'billing', '--title', 'Third').out;
  makeReady(third, { deps: 'NOPE-9' });
  const unknown = run(board, 'check', 'BILL-003');
  check('check reports an unknown dependency', unknown.code === 1 && /NOPE-9/.test(unknown.out + unknown.err), unknown.out + unknown.err);
  makeReady(third, { deps: 'none' });
  const clean = run(board, 'check', 'BILL-003');
  check('check passes a ready task', clean.code === 0 && /ready/.test(clean.out), clean.out + clean.err);
}

console.log('lite tasks');
{
  const board = newBoard();
  const lite = run(board, 'new', 'general', '--title', 'Fix footer typo', '--lite');
  check('new --lite succeeds', lite.code === 0, lite.err);
  const text = readFileSync(lite.out, 'utf8');
  const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  check('a lite task has only the lite sections',
    JSON.stringify(headings) === JSON.stringify(['Goal', 'Estimated Files', 'Acceptance Criteria', 'Execution Report', 'History']), headings.join(', '));
  check('a lite task is TRIVIAL', text.includes('| **Complexity** | TRIVIAL |'));
  const notTrivial = run(board, 'new', 'general', '--title', 'x', '--lite', '--complexity', 'SIMPLE');
  check('--lite refuses any other complexity', notTrivial.code === 1 && /TRIVIAL/.test(notTrivial.err), notTrivial.err);
  makeReady(lite.out);
  check('a filled lite task goes active without a Definition of Ready', run(board, 'move', 'TASK-001', 'active').code === 0);
  const liteSkip = run(board, 'move', 'TASK-001', 'review');
  check('a lite task still needs its Execution Report', liteSkip.code === 1, liteSkip.err);

  const full = run(board, 'new', 'general', '--title', 'Not lite', '--complexity', 'SIMPLE').out;
  writeFileSync(full, readFileSync(full, 'utf8').replace(/## Definition of Ready[\s\S]*?(?=\n## )/, ''));
  makeReady(full);
  const missing = run(board, 'check', 'TASK-002');
  check('a full task without its Definition of Ready is not ready', missing.code === 1 && /Definition of Ready/.test(missing.out + missing.err), missing.out + missing.err);
}

console.log('git base and diff');
{
  const repo = mkdtempSync(join(tmpdir(), 'strix-git-'));
  boards.push(join(repo, 'x'));
  const git = (...args) => spawnSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { encoding: 'utf8' });
  git('init', '-q');
  const board = join(repo, '.strix', 'tasks');
  cpSync(makeBoard(), board, { recursive: true });
  writeFileSync(join(repo, 'app.txt'), 'v1\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'initial');
  const base = git('rev-parse', 'HEAD').stdout.trim();

  run(board, 'new', 'general', '--title', 'Change app');
  makeReady(run(board, 'where', 'TASK-001').out);
  const moved = run(board, 'move', 'TASK-001', 'active');
  check('the move records Base as HEAD', readFileSync(moved.out, 'utf8').includes(`| **Base** | ${base} |`), readFileSync(moved.out, 'utf8').slice(0, 900));

  writeFileSync(join(repo, 'app.txt'), 'v2 for the task\n');
  git('commit', '-q', '-am', 'change app\n\nStrix-Task: TASK-001');
  writeFileSync(join(repo, 'other.txt'), 'unrelated\n');
  git('add', 'other.txt');
  git('commit', '-q', '-m', 'unrelated\n\nStrix-Task: TASK-0012');
  writeFileSync(join(repo, 'app.txt'), 'uncommitted\n');

  const diff = run(board, 'diff', 'TASK-001');
  check('diff succeeds', diff.code === 0, diff.err);
  check('diff shows the task\'s commit', diff.out.includes('+v2 for the task'), diff.out);
  check('diff skips other tasks\' commits', !diff.out.includes('unrelated'), diff.out);
  check('diff warns about uncommitted changes', /uncommitted/.test(diff.err) && diff.err.includes('app.txt'), diff.err);

  const outside = run(newBoard(), 'new', 'general', '--title', 'x');
  check('diff outside git fails clearly', /git/.test(run(join(outside.out, '..', '..', '..'), 'diff', 'TASK-001').err));
}

console.log('doctor, extended');
{
  const doctorOf = (board) => {
    const r = run(board, 'doctor');
    return { code: r.code, text: r.err + r.out };
  };

  // duplicate IDs and a header that disagrees with its filename
  {
    const board = newBoard();
    const a = run(board, 'new', 'general', '--title', 'One').out;
    cpSync(a, join(board, 'queue', 'general', 'TASK-001-copy.md'));
    const b = run(board, 'new', 'general', '--title', 'Two').out;
    writeFileSync(b, readFileSync(b, 'utf8').replace('| **ID** | TASK-002 |', '| **ID** | TASK-009 |'));
    const d = doctorOf(board);
    check('doctor finds a duplicate id', d.code === 1 && /TASK-001.*2 places|duplicate/i.test(d.text), d.text);
    check('doctor finds a header id that disagrees with the filename', /TASK-009/.test(d.text), d.text);
  }

  // EPIC, unknown dependency, and a dependency cycle
  {
    const board = newBoard();
    const a = run(board, 'new', 'general', '--title', 'A').out;
    const b = run(board, 'new', 'general', '--title', 'B').out;
    makeReady(a, { deps: 'TASK-002' });
    makeReady(b, { deps: 'TASK-001, GHOST-4' });
    writeFileSync(b, readFileSync(b, 'utf8').replace('| **Complexity** | STANDARD |', '| **Complexity** | EPIC |'));
    const d = doctorOf(board);
    check('doctor finds an EPIC on the board', /EPIC/.test(d.text), d.text);
    check('doctor finds an unknown dependency', /GHOST-4/.test(d.text), d.text);
    check('doctor finds a dependency cycle', /cycle/i.test(d.text) && /TASK-001/.test(d.text), d.text);
  }

  // A task that passed the gates and was then edited by hand is still caught.
  {
    const board = newBoard();
    const { id, path } = activeTask(board, 'general', 'Tampered');
    run(board, 'note', id, '--section', 'Execution Report', '--text', 'npm test → exit 0');
    const reviewPath = run(board, 'move', id, 'review').out;
    const template = readFileSync(join(board, 'TEMPLATE.md'), 'utf8');
    const goal = /## Goal\n\n([^\n]*)/.exec(template)[1];
    writeFileSync(reviewPath, readFileSync(reviewPath, 'utf8')
      .replace(/\| \*\*Base\*\* \|[^\n]*\n/, '')
      .replace(/(## Goal\n\n)[^\n]*/, (_m, h) => h + goal)
      .replace(/(## Execution Report\n)[\s\S]*?(\n## )/, '$1$2'));
    const d = doctorOf(board);
    check('doctor finds placeholders past the queue', /placeholder/.test(d.text), d.text);
    check('doctor finds a missing Base past the queue', /Base/.test(d.text), d.text);
    check('doctor finds an empty Execution Report in review', /Execution Report/.test(d.text), d.text);
    check('the tampered task is not excused', d.code === 1 && !/path/.test(path));
  }

  // A move made with --override is a recorded exception, not a permanent defect.
  {
    const board = newBoard();
    run(board, 'new', 'general', '--title', 'Legacy task');
    run(board, 'move', 'TASK-001', 'done', '--override', 'pre-1.1 task');
    const d = doctorOf(board);
    check('an overridden move leaves the board clean', d.code === 0, d.text);
    // An override waives only the gate that move crossed: a task overridden
    // into review keeps the gates its legitimate activation passed.
    const scoped = newBoard();
    const { id: sid } = activeTask(scoped, 'general', 'Scoped');
    run(scoped, 'move', sid, 'review', '--override', 'reviewer offline');
    const spath = run(scoped, 'where', sid).out;
    const goal = /## Goal\n\n([^\n]*)/.exec(readFileSync(join(scoped, 'TEMPLATE.md'), 'utf8'))[1];
    writeFileSync(spath, readFileSync(spath, 'utf8')
      .replace(/(## Goal\n\n)[^\n]*/, (_m, h) => h + goal)
      .replace(/\| \*\*Base\*\* \|[^\n]*\n/, ''));
    const sd = doctorOf(scoped);
    check('an override into review does not waive the placeholder gate', /placeholder/.test(sd.text), sd.text);
    check('an override into review does not waive the Base gate', /Base/.test(sd.text), sd.text);
    check('an override into review waives only its own report gate', !/Execution Report/.test(sd.text), sd.text);

    const forced = run(board, 'new', 'general', '--title', 'Second').out;
    run(board, 'move', 'TASK-002', 'review', '--override', 'imported');
    writeFileSync(forced.replace('/queue/', '/review/'), readFileSync(run(board, 'where', 'TASK-002').out, 'utf8'));
    check('a later ordinary move is still checked',
      run(board, 'move', 'TASK-002', 'active').code === 1);
  }

  // registry status outside the enum
  {
    const board = newBoard();
    writeFileSync(join(board, 'workstreams.yaml'), 'workstreams:\n  - id: general\n    prefix: TASK\n    owner: shared\n    status: paused\n');
    const d = doctorOf(board);
    check('doctor rejects an unknown registry status', d.code === 1 && /paused/.test(d.text), d.text);
  }

  // a board that followed every gate is clean
  {
    const board = newBoard();
    activeTask(board, 'general', 'Clean');
    finish(board, 'TASK-001');
    const d = doctorOf(board);
    check('doctor passes a board that followed the gates', d.code === 0, d.text);
  }
}

console.log('readiness edge cases');
{
  const board = newBoard();
  const fresh = () => {
    const out = run(board, 'new', 'general', '--title', 'Edge').out;
    makeReady(out);
    return { path: out, id: /(TASK-\d+)/.exec(out)[1] };
  };
  const template = readFileSync(join(board, 'TEMPLATE.md'), 'utf8');
  const blockOf = (name) => new RegExp(`## ${name}\n\n([\\s\\S]*?)\n\n## `).exec(template)[1];

  // Placeholders the gate must still see: multi-line, symbol-only, inside inline code.
  for (const [label, name, body] of [
    ['a multi-line placeholder', 'Background', blockOf('Background')],
    ['a `<…>` row', 'Requirements', '- [ ] Real requirement\n- [ ] <…>'],
    ['a placeholder inside inline code', 'Estimated Files', '- `<path/to/file>` — created'],
  ]) {
    const t = fresh();
    writeFileSync(t.path, readFileSync(t.path, 'utf8').replace(new RegExp(`(## ${name}\n\n)[\\s\\S]*?(\n\n## )`), (_m, a, b) => a + body + b));
    const r = run(board, 'check', t.id);
    check(`the gate sees ${label}`, r.code === 1 && /placeholder/.test(r.out), r.out);
  }

  const realAngles = fresh();
  writeFileSync(realAngles.path, readFileSync(realAngles.path, 'utf8').replace(/(## Goal\n\n)[^\n]*/,
    '$1Render `<Title>` on `/users/<ID>` and document `strix-task note <ID>`; prefix is `<PREFIX>`.'));
  const angles = run(board, 'check', realAngles.id);
  check('the short title-line placeholders are not flagged in real content', angles.code === 0, angles.out);

  const rewrapped = fresh();
  writeFileSync(rewrapped.path, readFileSync(rewrapped.path, 'utf8').replace(/(## Background\n\n)[\s\S]*?(\n\n## )/,
    (_m, a, b) => a + blockOf('Background').replace(/\s+/g, ' ') + b));
  check('a placeholder rewrapped onto one line is still seen', run(board, 'check', rewrapped.id).code === 1);

  const star = fresh();
  writeFileSync(star.path, readFileSync(star.path, 'utf8').replace('- [x] Acceptance Criteria are testable', '* [ ] Acceptance Criteria are testable'));
  check('an unticked `* [ ]` box blocks the move', run(board, 'check', star.id).code === 1);

  const prose = fresh();
  writeFileSync(prose.path, readFileSync(prose.path, 'utf8').replace(/(## Dependencies\n\n)[^\n]*/, '$1- none — needs the UTF-8 decoder (RFC-3629, SHA-256)'));
  const proseCheck = run(board, 'check', prose.id);
  check('ordinary hyphenated tokens are not dependencies', proseCheck.code === 0, proseCheck.out);

  for (const [label, line, ok] of [
    ['a line starting with a non-ID token', '- UTF-8 decoding support', true],
    ['a "none" line that mentions a task', '- none (unlike TASK-001, this needs nothing)', true],
    ['a listed unregistered ID', '- NOPE-9 (the parser)', false],
    ['two listed IDs', '- TASK-001, GHOST-4', false],
  ]) {
    const t = fresh();
    writeFileSync(t.path, readFileSync(t.path, 'utf8').replace(/(## Dependencies\n\n)[^\n]*/, (_m, a) => a + line));
    const r = run(board, 'check', t.id);
    check(`dependencies: ${label} ${ok ? 'names nothing' : 'is a dependency'}`, (r.code === 0) === ok, r.out);
  }

  const crlf = fresh();
  writeFileSync(crlf.path, readFileSync(crlf.path, 'utf8').replace(/\n/g, '\r\n'));
  const crlfCheck = run(board, 'check', crlf.id);
  check('a CRLF task file is read correctly', crlfCheck.code === 0, crlfCheck.out);
  run(board, 'move', crlf.id, 'active');
  check('a CRLF task keeps one History section', (readFileSync(run(board, 'where', crlf.id).out, 'utf8').match(/^## History/gm) ?? []).length === 1);

  const note = run(board, 'note', crlf.id, '--section', 'Execution Report', '--file', '-');
  check('note --file - with empty stdin is refused', note.code === 1, note.err);
  const withHeadings = join(board, 'report.txt');
  writeFileSync(withHeadings, 'ran tests\n## Summary\n---\nall good\n');
  run(board, 'note', crlf.id, '--section', 'Execution Report', '--file', withHeadings);
  const noted = readFileSync(run(board, 'where', crlf.id).out, 'utf8');
  check('a heading inside a note cannot open a section', !/^## Summary/m.test(noted) && /^ {4}## Summary/m.test(noted), noted.slice(-600));
  check('a rule inside a note cannot end the section', /^ {4}---$/m.test(noted));

  // A board seeded before the new sections existed cannot mint gate-passing tasks.
  const old = newBoard();
  writeFileSync(join(old, 'TEMPLATE.md'), template.replace(/\n## Execution Report[\s\S]*?(?=\n---\n)/, ''));
  const stale = run(old, 'new', 'general', '--title', 'x');
  check('new refuses an outdated TEMPLATE.md and says how to refresh it', stale.code === 1 && /outdated/.test(stale.err) && /strix-init/.test(stale.err), stale.err);
}

console.log('ordering');
{
  const board = newBoard();
  const first = run(board, 'new', 'general', '--title', 'n').out;
  // Zero-padding hides a string sort until IDs outgrow it.
  for (const n of ['1000', '999']) {
    writeFileSync(join(board, 'queue', 'general', `TASK-${n}-n.md`),
      readFileSync(first, 'utf8').replace('| **ID** | TASK-001 |', `| **ID** | TASK-${n} |`));
  }
  const listed = run(board, 'ls').out;
  check('ls sorts ids numerically', listed.indexOf('TASK-999') < listed.indexOf('TASK-1000'), listed);
}

console.log('git base, extended');
{
  const repo = mkdtempSync(join(tmpdir(), 'strix-git2-'));
  boards.push(join(repo, 'x'));
  const git = (...args) => spawnSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { encoding: 'utf8' });
  git('init', '-q');
  // The board lives below the repository root.
  const board = join(repo, 'app', '.strix', 'tasks');
  cpSync(makeBoard(), board, { recursive: true });
  writeFileSync(join(repo, 'app', 'code.txt'), 'v0\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'early\n\nStrix-Task: TASK-001');
  writeFileSync(join(repo, 'app', 'code.txt'), 'v1 before base\n');
  git('commit', '-q', '-am', 'still before base\n\nStrix-Task: TASK-001');

  run(board, 'new', 'general', '--title', 'Base once');
  makeReady(run(board, 'where', 'TASK-001').out);
  run(board, 'move', 'TASK-001', 'active');
  const base = git('rev-parse', 'HEAD').stdout.trim();
  writeFileSync(join(repo, 'app', 'code.txt'), 'v2 in the task\n');
  git('commit', '-q', '-am', 'task work\n\nStrix-Task: TASK-001');

  writeFileSync(join(repo, 'café notes.txt'), 'dirty\n');
  const accented = run(board, 'diff', 'TASK-001');
  check('diff survives a non-ASCII dirty path', accented.code === 0 && accented.err.includes('café notes.txt'), accented.err);
  rmSync(join(repo, 'café notes.txt'));

  const diff = run(board, 'diff', 'TASK-001');
  check('diff starts at Base', diff.out.includes('+v2 in the task') && !diff.out.includes('+v1 before base'), diff.out);
  check('diff ignores board changes below the repo root', !/warning/.test(diff.err), diff.err);

  // With the board committed, the only change is a tracked task file edited in place.
  git('add', '-A');
  git('commit', '-q', '-m', 'board');
  run(board, 'note', 'TASK-001', '--section', 'Execution Report', '--text', 'ok');
  const afterNote = run(board, 'diff', 'TASK-001');
  check('diff ignores an in-place board edit', !/warning/.test(afterNote.err), afterNote.err);
  run(board, 'move', 'TASK-001', 'review');
  run(board, 'note', 'TASK-001', '--section', 'Review Checklist', '--text', '- fix it');
  run(board, 'move', 'TASK-001', 'active');
  check('Base is recorded once, not on every activation',
    readFileSync(run(board, 'where', 'TASK-001').out, 'utf8').includes(`| **Base** | ${base} |`));
}

console.log('registry comments and slugs');
{
  const board = newBoard();
  const seed = readFileSync(join(ROOT, 'templates', 'strix', 'tasks', 'workstreams.yaml'), 'utf8');
  run(board, 'workstream', 'add', 'billing', '--prefix', 'BILL', '--owner', 'quan');
  const added = readFileSync(join(board, 'workstreams.yaml'), 'utf8');
  check('workstream add keeps every comment and line of the registry', added.startsWith(seed), added);
  check('workstream add appends the new entry', added.endsWith('  - id: billing\n    prefix: BILL\n    owner: quan\n    status: active\n'), added);

  run(board, 'workstream', 'close', 'billing');
  const closed = readFileSync(join(board, 'workstreams.yaml'), 'utf8');
  check('workstream close edits only the status line', closed === added.replace(/status: active\n$/, 'status: closed\n'), closed);

  const badOwner = run(board, 'workstream', 'add', 'x', '--prefix', 'X', '--owner', 'me # boss');
  check('an owner that the registry cannot hold is refused', badOwner.code === 1 && /owner/.test(badOwner.err), badOwner.err);

  // A registry entry may list its keys in any order; `close` must still find it.
  const reordered = newBoard();
  writeFileSync(join(reordered, 'workstreams.yaml'),
    `${readFileSync(join(reordered, 'workstreams.yaml'), 'utf8')}  - status: active\n    id: billing\n    prefix: BILL\n    owner: quan\n`);
  const closedOdd = run(reordered, 'workstream', 'close', 'billing');
  check('close finds an entry whose id is not the first key', closedOdd.code === 0, closedOdd.err);
  check('close sets that entry to closed', /status: closed/.test(readFileSync(join(reordered, 'workstreams.yaml'), 'utf8')));

  const fresh = newBoard();
  rmSync(join(fresh, 'workstreams.yaml'));
  run(fresh, 'migrate');
  check('migrate seeds the registry from the plugin template', readFileSync(join(fresh, 'workstreams.yaml'), 'utf8') === seed);

  const longTitle = run(board, 'new', 'general', '--title', `${'a'.repeat(47)} b`);
  check('a truncated slug never ends in a hyphen', /-a+\.md$/.test(longTitle.out), longTitle.out);
  const wide = run(board, 'new', 'general', '--title', 'ＡＢＣ fullwidth');
  check('fullwidth letters survive slugging', /abc-fullwidth\.md$/.test(wide.out), wide.out);

  const accented = run(board, 'new', 'general', '--title', 'Sửa lỗi đăng nhập Café');
  check('titles lose their accents, not their letters, in the slug', /-sua-loi-dang-nhap-cafe\.md$/.test(accented.out), accented.out);
}

/* ── report ──────────────────────────────────────────────────────────── */

for (const b of boards) rmSync(join(b, '..'), { recursive: true, force: true });

if (failures) {
  console.error(`\n✗ ${failures} of ${checks} strix-task check(s) failed`);
  process.exit(1);
}
console.log(`\n✓ strix-task: ${checks} checks passed`);
