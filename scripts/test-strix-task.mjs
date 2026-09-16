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

const CLI = join(ROOT, 'bin', 'strix-task');
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
  const r = spawnSync(process.execPath, [CLI, '--board', board, ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

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
    created.out.endsWith(join('queue', 'billing-system', 'BILL-001.md')), created.out);

  const body = readFileSync(created.out, 'utf8');
  check('new fills the Workstream field', /\| \*\*Workstream\*\* \| billing-system \|/.test(body));
  check('new fills the title heading', body.startsWith('# BILL-001: Add invoice model'));
  check('new starts the task Queued', /\| \*\*Status\*\* \| Queued \|/.test(body));

  // Per-workstream counters are independent: a second workstream restarts at 001.
  run(board, 'workstream', 'add', 'search-revamp', '--prefix', 'SRCH', '--owner', 'colleague');
  const other = run(board, 'new', 'search-revamp', '--title', 'Reindex nightly');
  check('a second workstream has its own counter', other.out.endsWith('SRCH-001.md'), other.out);

  const second = run(board, 'new', 'billing-system', '--title', 'Add invoice API');
  check('the counter advances within a workstream', second.out.endsWith('BILL-002.md'), second.out);

  const moved = run(board, 'move', 'BILL-001', 'active');
  check('move succeeds', moved.code === 0, moved.err);
  check('move keeps the task in its workstream',
    moved.out.endsWith(join('active', 'billing-system', 'BILL-001.md')), moved.out);
  check('move rewrites the Status field',
    /\| \*\*Status\*\* \| In Progress \|/.test(readFileSync(moved.out, 'utf8')));

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
  run(board, 'new', 'billing-system', '--title', 'Only task');
  run(board, 'move', 'BILL-001', 'active');

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
    const renamed = join(board, 'queue', 'billing-system', 'WRONG-001.md');
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
    renameSync(path, join(stray, 'BILL-001.md'));
    const r = run(board, 'doctor');
    check('invariant 4: an unregistered workstream fails', r.code === 1, r.out);
    check('invariant 4: the message names the registry', /is not in workstreams\.yaml/.test(r.err), r.err);
  }

  // 4b. A closed workstream may keep finished tasks but not live ones.
  {
    const { board } = seeded();
    run(board, 'move', 'BILL-001', 'done');
    const closed = run(board, 'workstream', 'close', 'billing-system');
    check('a workstream with only finished tasks can be closed', closed.code === 0, closed.err);
    check('doctor still passes with a closed workstream holding done work', run(board, 'doctor').code === 0);

    const reopened = run(board, 'move', 'BILL-001', 'active');
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

/* ── report ──────────────────────────────────────────────────────────── */

for (const b of boards) rmSync(join(b, '..'), { recursive: true, force: true });

if (failures) {
  console.error(`\n✗ ${failures} of ${checks} strix-task check(s) failed`);
  process.exit(1);
}
console.log(`\n✓ strix-task: ${checks} checks passed`);
