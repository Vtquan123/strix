#!/usr/bin/env node
/**
 * Test for bin/strix-init and the .strix/bin/strix-task shim it writes.
 *
 * Seeds throwaway projects in temp directories through the real script and
 * checks what lands on disk. HOME points at a temp directory, so the shim's
 * plugin-cache lookup never sees a real install.
 *
 *   node scripts/test-strix-init.mjs
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './lib/config.mjs';

const INIT = join(ROOT, 'bin', 'strix-init');

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks++;
  if (condition) return;
  failures++;
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
}

const temps = [];
function temp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

// An environment with no plugin-root hints: a HOME with no plugin cache, and a
// PATH without the plugin bin/ directories Claude Code adds to it.
const HOME = temp('strix-home-');
const PATH = process.env.PATH.split(':').filter((d) => !d.includes('/.claude/plugins/')).join(':');
const cleanEnv = (extra = {}) => {
  const env = { ...process.env, HOME, PATH };
  delete env.STRIX_PLUGIN_ROOT;
  delete env.CLAUDE_PLUGIN_ROOT;
  delete env.CLAUDE_CONFIG_DIR;
  const merged = { ...env, ...extra };
  for (const [k, v] of Object.entries(merged)) if (v === undefined) delete merged[k];
  return merged;
};

function exec(cmd, args, env = cleanEnv()) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env, timeout: 20000 });
  return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '', all: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const init = (project, ...args) => exec(INIT, ['--target', project, ...args]);
// Missing files read as '' so a failed expectation reports instead of throwing.
const read = (project, rel) => (existsSync(join(project, rel)) ? readFileSync(join(project, rel), 'utf8') : '');
const write = (project, rel, text) => {
  mkdirSync(join(project, rel, '..'), { recursive: true });
  writeFileSync(join(project, rel), text);
};
const has = (project, rel) => existsSync(join(project, rel));

const MARKER = {
  cline: '.clinerules/identity.md',
  copilot: '.github/prompts/implement.prompt.md',
  claude: '.claude/agents/strix-executor.md',
};
const CATALOG = {
  cline: '.clinerules/skills/README.md',
  copilot: '.github/skills/README.md',
  claude: '.strix/executor/skills/README.md',
};

/* ── a fresh project, per executor ───────────────────────────────────── */

console.log('fresh init');
for (const executor of ['cline', 'copilot', 'claude']) {
  const project = temp(`strix-init-${executor}-`);
  const r = init(project, '--executor', executor);
  check(`${executor}: init succeeds`, r.code === 0, r.all);
  check(`${executor}: records the executor`, /^executor: (\S+)$/m.exec(read(project, '.strix/config.yaml'))?.[1] === executor);
  check(`${executor}: seeds the board`, has(project, '.strix/tasks/workstreams.yaml') && has(project, '.strix/tasks/TEMPLATE.md'));
  check(`${executor}: seeds the executor tree`, has(project, MARKER[executor]));

  const shim = join(project, '.strix/bin/strix-task');
  check(`${executor}: the shim is world-executable (0755)`, (statSync(shim).mode & 0o777) === 0o755, (statSync(shim).mode & 0o777).toString(8));
  check(`${executor}: the shim holds no machine path`, !read(project, '.strix/bin/strix-task').includes(ROOT));
  check(`${executor}: local.yaml records the plugin root`,
    read(project, '.strix/local.yaml').includes(`plugin_root: "${ROOT}"`), read(project, '.strix/local.yaml') || 'missing');
  check(`${executor}: local.yaml is gitignored`,
    read(project, '.strix/.gitignore').split('\n').includes('local.yaml'));
}

console.log('help');
{
  const r = exec(INIT, ['--help']);
  check('--help exits 0 and documents --force-executor', r.code === 0 && r.out.includes('--force-executor'), r.all);
}

/* ── re-running never destroys project state ─────────────────────────── */

console.log('re-run and --force');
{
  const project = temp('strix-init-rerun-');
  init(project, '--executor', 'cline');
  write(project, '.strix/knowledge/project-context.md', 'REAL KNOWLEDGE\n');
  write(project, '.strix/tasks/workstreams.yaml', `${read(project, '.strix/tasks/workstreams.yaml')}  - id: billing\n    prefix: BILL\n    owner: me\n    status: active\n`);
  write(project, CATALOG.cline, 'INSTALLED SKILLS\n');
  write(project, '.strix/tasks/TEMPLATE.md', 'STALE TEMPLATE\n');
  write(project, '.clinerules/identity.md', 'STALE RULES\n');

  chmodSync(join(project, '.strix/bin/strix-task'), 0o644);
  const again = init(project, '--executor', 'cline');
  check('a re-run restores the shim\'s mode', (statSync(join(project, '.strix/bin/strix-task')).mode & 0o777) === 0o755);
  check('a plain re-run succeeds', again.code === 0, again.all);
  check('a plain re-run skips existing files', again.out.includes('skip (exists)'));
  check('a plain re-run keeps a stale template', read(project, '.strix/tasks/TEMPLATE.md') === 'STALE TEMPLATE\n');

  const forced = init(project, '--force');
  check('--force succeeds', forced.code === 0, forced.all);
  check('--force keeps populated knowledge', read(project, '.strix/knowledge/project-context.md') === 'REAL KNOWLEDGE\n');
  check('--force keeps the workstream registry', read(project, '.strix/tasks/workstreams.yaml').includes('id: billing'));
  check('--force keeps the executor skill catalog', read(project, CATALOG.cline) === 'INSTALLED SKILLS\n');
  check('--force refreshes plugin-owned seed files', read(project, '.strix/tasks/TEMPLATE.md') !== 'STALE TEMPLATE\n');
  check('--force refreshes the executor rules', read(project, '.clinerules/identity.md') !== 'STALE RULES\n');
  check('--force says what it protected', /keep \(protected\)/.test(forced.out), forced.out);

  // A knowledge file the project never had is still seeded under --force.
  rmSync(join(project, '.strix/knowledge/glossary.md'));
  init(project, '--force');
  check('--force seeds a missing knowledge file', has(project, '.strix/knowledge/glossary.md'));
}

console.log('--force-executor');
{
  const project = temp('strix-init-fe-');
  init(project, '--executor', 'claude');
  write(project, CATALOG.claude, 'INSTALLED SKILLS\n');
  write(project, '.strix/executor/identity.md', 'STALE RULES\n');
  write(project, '.strix/tasks/TEMPLATE.md', 'STALE TEMPLATE\n');

  const r = init(project, '--force-executor');
  check('--force-executor succeeds', r.code === 0, r.all);
  check('--force-executor refreshes the executor rules', read(project, '.strix/executor/identity.md') !== 'STALE RULES\n');
  check('--force-executor keeps the skill catalog', read(project, CATALOG.claude) === 'INSTALLED SKILLS\n');
  check('--force-executor leaves the .strix seed alone', read(project, '.strix/tasks/TEMPLATE.md') === 'STALE TEMPLATE\n');
}

/* ── switching executors ─────────────────────────────────────────────── */

console.log('executor switch');
{
  const project = temp('strix-init-switch-');
  init(project, '--executor', 'cline');
  write(project, '.strix/config.yaml', `${read(project, '.strix/config.yaml')}# team note\ncustom_key: keep-me\n`);

  const refused = init(project, '--executor', 'copilot');
  check('a switch without a force flag exits 0', refused.code === 0, refused.all);
  check('a switch without a force flag warns', /already initialized with executor 'cline'/.test(refused.out), refused.out);
  check('a switch without a force flag names --force-executor', refused.out.includes('--force-executor'), refused.out);
  check('a refused switch keeps the recorded executor', /^executor: cline$/m.test(read(project, '.strix/config.yaml')));
  check('a refused switch seeds nothing for the new executor', !has(project, MARKER.copilot));

  const kept = init(project);
  check('a re-run with no --executor keeps the recorded one without warning',
    kept.code === 0 && !/already initialized/.test(kept.out) && /executor: cline/.test(kept.out), kept.out);

  const switched = init(project, '--executor', 'copilot', '--force-executor');
  check('--force-executor switches', switched.code === 0 && /^executor: copilot$/m.test(read(project, '.strix/config.yaml')), switched.all);
  check('a switch seeds the new executor', has(project, MARKER.copilot));
  const config = read(project, '.strix/config.yaml');
  check('a switch edits config.yaml in place', config.includes('# team note') && config.includes('custom_key: keep-me'), config);
  check('a switch lists the old executor\'s files', switched.out.includes('.clinerules/identity.md'), switched.out);
  check('a switch deletes nothing', has(project, MARKER.cline));
  check('a switch never points at a whole config root',
    !/^\s*\.github\/?\s*$/m.test(switched.out) && !/^\s*\.clinerules\/?\s*$/m.test(switched.out), switched.out);
}

console.log('switch edge cases');
{
  // The old executor's files are mostly gone: listing them must not abort the run.
  const project = temp('strix-init-sparse-');
  init(project, '--executor', 'cline');
  rmSync(join(project, '.clinerules'), { recursive: true });
  write(project, MARKER.cline, 'kept\n');
  const r = init(project, '--executor', 'copilot', '--force-executor');
  check('a switch with missing old files still succeeds', r.code === 0 && r.out.includes('strix-init: done'), r.all);
  check('a switch with missing old files lists what remains', r.out.includes(MARKER.cline), r.out);

  // A file the user already had in the new executor's tree survives a forced switch.
  for (const flag of ['--force-executor', '--force']) {
    const own = temp('strix-init-own-');
    init(own, '--executor', 'cline');
    write(own, '.github/copilot-instructions.md', 'MY OWN RULES\n');
    const s = init(own, '--executor', 'copilot', flag);
    check(`${flag} switch keeps the user's own file`, read(own, '.github/copilot-instructions.md') === 'MY OWN RULES\n');
    check(`${flag} switch flags the kept file loudly`, /warning: .*copilot-instructions\.md/.test(s.all), s.all);
    check(`${flag} switch still seeds the rest`, has(own, MARKER.copilot));
  }

  // Once seeded, the executor's files are Strix's own: --force-executor refreshes them.
  const reseeded = temp('strix-init-reseed-');
  init(reseeded, '--executor', 'copilot');
  write(reseeded, '.github/copilot-instructions.md', 'STALE\n');
  const again = init(reseeded, '--force-executor');
  check('--force-executor refreshes an already-seeded executor file', read(reseeded, '.github/copilot-instructions.md') !== 'STALE\n');
  check('--force-executor on a seeded executor does not warn', !/warning/.test(again.all), again.all);
}

console.log('pre-existing executor files');
{
  const project = temp('strix-init-existing-');
  write(project, '.clinerules/coding.md', 'MY OWN RULES\n');
  const r = init(project, '--executor', 'cline');
  check('init succeeds next to user files', r.code === 0, r.all);
  check('a user file is kept', read(project, '.clinerules/coding.md') === 'MY OWN RULES\n');
  check('a kept user file is flagged loudly', /warning: .*\.clinerules\/coding\.md/.test(r.all), r.all);

  // A file identical to the seed is not a conflict.
  const same = temp('strix-init-same-');
  mkdirSync(join(same, '.clinerules'), { recursive: true });
  cpSync(join(ROOT, 'templates/executors/cline/.clinerules/coding.md'), join(same, '.clinerules/coding.md'));
  const quiet = init(same, '--executor', 'cline');
  check('a pre-existing file identical to the seed is not flagged', quiet.code === 0 && !/warning/.test(quiet.all), quiet.all);
}

console.log('config parsing');
{
  const project = temp('strix-init-quoted-');
  init(project, '--executor', 'cline');
  write(project, '.strix/config.yaml', 'schema: 1\r\nexecutor: "cline"   # chosen by the team\r\n');
  const r = init(project, '--executor', 'cline');
  check('a quoted, commented, CRLF executor value still matches', r.code === 0 && !/already initialized/.test(r.out), r.out);
}

/* ── rejecting a bad executor ────────────────────────────────────────── */

console.log('executor validation');
for (const bad of ['../../templates/strix', 'nope', 'Cline', '']) {
  const project = temp('strix-init-bad-');
  const r = init(project, '--executor', bad);
  check(`rejects --executor ${JSON.stringify(bad)}`, r.code === 2, r.all);
  check(`writes nothing for --executor ${JSON.stringify(bad)}`, !has(project, '.strix'));
}

/* ── the shim finds the plugin ───────────────────────────────────────── */

console.log('shim resolution');
{
  const project = temp('strix-init-shim-');
  init(project, '--executor', 'cline');
  const shim = join(project, '.strix/bin/strix-task');
  const ok = (r) => r.code === 0 && r.out.includes('manage a Strix task board');

  check('shim resolves through local.yaml', ok(exec(shim, ['--help'])), exec(shim, ['--help']).all);
  check('shim resolves through STRIX_PLUGIN_ROOT', ok(exec(shim, ['--help'], cleanEnv({ STRIX_PLUGIN_ROOT: ROOT }))));
  // Point local.yaml somewhere useless so the next checks prove their own source.
  const savedLocal = read(project, '.strix/local.yaml');
  write(project, '.strix/local.yaml', `plugin_root: ${join(project, 'nowhere')}\n`);
  check('STRIX_PLUGIN_ROOT alone is enough', ok(exec(shim, ['--help'], cleanEnv({ STRIX_PLUGIN_ROOT: ROOT }))));
  check('CLAUDE_PLUGIN_ROOT alone is enough', ok(exec(shim, ['--help'], cleanEnv({ CLAUDE_PLUGIN_ROOT: ROOT }))));
  write(project, '.strix/local.yaml', savedLocal);

  const badExplicit = exec(shim, ['--help'], cleanEnv({ STRIX_PLUGIN_ROOT: join(project, 'nowhere') }));
  check('an unusable STRIX_PLUGIN_ROOT is an error, not a fallback',
    badExplicit.code === 1 && badExplicit.err.includes('STRIX_PLUGIN_ROOT'), badExplicit.all);

  const otherPlugin = temp('strix-other-plugin-');
  check('shim skips a CLAUDE_PLUGIN_ROOT that is not Strix',
    ok(exec(shim, ['--help'], cleanEnv({ CLAUDE_PLUGIN_ROOT: otherPlugin }))));

  // Inside Claude Code the enabled plugin's bin/ is on PATH.
  const viaPath = exec(shim, ['--help'], cleanEnv({ PATH: `${join(ROOT, 'bin')}:${PATH}` }));
  check('shim resolves through the plugin bin/ on PATH', ok(viaPath), viaPath.all);

  rmSync(join(project, '.strix/local.yaml'));
  const none = exec(shim, ['--help']);
  check('shim fails clearly when nothing resolves', none.code === 1 && /cannot find the Strix plugin/.test(none.err), none.all);

  const selfOnPath = exec(shim, ['--help'], cleanEnv({ PATH: `${join(project, '.strix/bin')}:${PATH}` }));
  check('shim never resolves to itself through PATH', selfOnPath.code === 1 && /cannot find the Strix plugin/.test(selfOnPath.err), selfOnPath.all);

  const cache = join(HOME, '.claude', 'plugins', 'cache', 'some-marketplace', 'strix');
  mkdirSync(join(cache, '1.10.0'), { recursive: true }); // newest, but not a usable install
  symlinkSync(ROOT, join(cache, '1.9.0'));
  const cached = exec(shim, ['--help']);
  check('shim falls back to a usable install in the plugin cache', ok(cached), cached.all);
  rmSync(join(HOME, '.claude'), { recursive: true, force: true });

  write(project, '.strix/local.yaml', `plugin_root: ${ROOT}\n`);
  check('shim accepts an unquoted plugin_root', ok(exec(shim, ['--help'])));
  write(project, '.strix/local.yaml', `plugin_root: ${ROOT}   # this laptop\r\n`);
  check('shim ignores a trailing comment and CR in local.yaml', ok(exec(shim, ['--help'])), exec(shim, ['--help']).all);
  const odd = join(temp('strix-odd-'), 'a #b');
  symlinkSync(ROOT, odd);
  write(project, '.strix/local.yaml', `plugin_root: "${odd}"\n`);
  check('shim keeps " #" inside a quoted plugin_root', ok(exec(shim, ['--help'])), exec(shim, ['--help']).all);

  const runs = exec(shim, ['--board', join(project, '.strix/tasks'), 'doctor']);
  check('shim runs real commands against the seeded board', runs.code === 0, runs.all);

  rmSync(join(project, '.strix/local.yaml'));
  const noHome = exec(shim, ['--help'], cleanEnv({ HOME: undefined }));
  check('with HOME unset the shim reaches its clean error',
    noHome.code === 1 && /cannot find the Strix plugin/.test(noHome.err) && !/unbound variable/.test(noHome.err), noHome.all);
}

/* ── report ──────────────────────────────────────────────────────────── */

for (const dir of temps) rmSync(dir, { recursive: true, force: true });

if (failures) {
  console.error(`\n✗ ${failures} of ${checks} strix-init check(s) failed`);
  process.exit(1);
}
console.log(`\n✓ strix-init: ${checks} checks passed`);
