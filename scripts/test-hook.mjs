#!/usr/bin/env node
/**
 * Test for hooks/strix-context.sh, the SessionStart context injector.
 *
 * Runs the real hook against throwaway project directories with the same
 * environment Claude Code gives it (CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT).
 *
 *   node scripts/test-hook.mjs
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './lib/config.mjs';

const HOOK = join(ROOT, 'hooks', 'strix-context.sh');

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks++;
  if (condition) return;
  failures++;
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
}

const temps = [];

/** A project directory; `files` maps relative paths to contents. */
function project(files = {}, prefix = 'strix-hook-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

function hook(dir, env = { CLAUDE_PLUGIN_ROOT: ROOT }) {
  const r = spawnSync('bash', [HOOK], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CLAUDE_PROJECT_DIR: dir, ...env },
  });
  return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '' };
}

const read = (dir, rel) => (existsSync(join(dir, rel)) ? readFileSync(join(dir, rel), 'utf8') : '');
const KNOWLEDGE_OK = { '.strix/knowledge/project-context.md': '# Project Context\n\nA real project.\n' };

console.log('activation');
{
  const r = hook(project());
  check('a project without .strix/ gets nothing', r.code === 0 && r.out === '' && r.err === '', r.out + r.err);
}

console.log('contract rendering');
{
  const dir = project({ '.strix/config.yaml': 'schema: 1\nexecutor: cline\n', ...KNOWLEDGE_OK });
  const r = hook(dir);
  check('the hook succeeds', r.code === 0, r.err);
  check('the contract is printed', r.out.includes('# Strix Operating Contract'));
  check('no literal ${CLAUDE_PLUGIN_ROOT} reaches the model', !r.out.includes('${CLAUDE_PLUGIN_ROOT}'));
  check('the plugin path is substituted', r.out.includes(`${ROOT}/reference/`), r.out.slice(-1500));
  check('generated-region markers are stripped', !r.out.includes('strix:gen'));
  check('generated content itself survives', r.out.includes('`feature` · `fix`'));
  check('the executor resolves', r.out.includes('Active executor: **Cline** (`cline`)'), r.out.slice(-600));
  check('a healthy project gets no warnings', !/warning/i.test(r.out), r.out.slice(-600));
}

console.log('executor value parsing');
for (const [label, config] of [
  ['double quotes', 'schema: 1\nexecutor: "claude"\n'],
  ['single quotes', "schema: 1\nexecutor: 'claude'\n"],
  ['a trailing comment', 'schema: 1\nexecutor: claude   # chosen by the team\n'],
  ['CRLF line endings', 'schema: 1\r\nexecutor: claude\r\n'],
]) {
  const r = hook(project({ '.strix/config.yaml': config, ...KNOWLEDGE_OK }));
  check(`resolves an executor written with ${label}`,
    r.out.includes('Active executor: **Claude (executor)** (`claude`)') && r.out.includes('Its counterpart config lives at `.strix/executor/`'),
    r.out.slice(-600));
}

console.log('warnings');
{
  const unknown = hook(project({ '.strix/config.yaml': 'schema: 1\nexecutor: vim\n', ...KNOWLEDGE_OK }));
  check('an unknown executor is called out', /warning: .*`vim`.*not a known executor/i.test(unknown.out), unknown.out.slice(-600));

  const noSchema = hook(project({ '.strix/config.yaml': 'executor: cline\n', ...KNOWLEDGE_OK }));
  check('a missing schema is called out', /warning: .*schema/i.test(noSchema.out), noSchema.out.slice(-600));

  const future = hook(project({ '.strix/config.yaml': 'schema: 7\nexecutor: cline\n', ...KNOWLEDGE_OK }));
  check('an unsupported schema is called out', /warning: .*schema.*7/i.test(future.out), future.out.slice(-600));

  const template = hook(project({
    '.strix/config.yaml': 'schema: 1\nexecutor: cline\n',
    '.strix/knowledge/project-context.md': '# Project Context\n\nThis is a TEMPLATE. When Strix is adopted...\n',
  }));
  check('template knowledge points at project-scan',
    /warning: .*project-context\.md/i.test(template.out) && template.out.includes('project-scan'), template.out.slice(-600));

  // Regex and sed metacharacters in the project path must not mangle the list.
  const weird = hook(project({
    '.strix/config.yaml': 'schema: 1\nexecutor: cline\n',
    '.strix/knowledge/glossary.md': '<!-- This is a TEMPLATE. -->\n',
  }, 'strix-hook-we#ird [x] & $p-'));
  check('template warning survives an odd project path',
    weird.code === 0 && weird.err === '' && /warning: .*\.strix\/knowledge\/glossary\.md/i.test(weird.out), weird.err + weird.out.slice(-400));

  const noConfig = hook(project({ '.strix/tasks/.gitkeep': '' }));
  check('a missing config points at /strix:init', noConfig.code === 0 && noConfig.out.includes('/strix:init'), noConfig.out.slice(-300));
}

console.log('local plugin root');
{
  const dir = project({ '.strix/config.yaml': 'schema: 1\nexecutor: cline\n', '.strix/.gitignore': 'other-file', ...KNOWLEDGE_OK });
  hook(dir);
  check('the hook records the plugin root for the shim', read(dir, '.strix/local.yaml').includes(`plugin_root: "${ROOT}"`), read(dir, '.strix/local.yaml'));
  check('the hook keeps local.yaml out of git', read(dir, '.strix/.gitignore') === 'other-file\nlocal.yaml\n', JSON.stringify(read(dir, '.strix/.gitignore')));

  const r = hook(dir);
  check('a second session changes nothing', read(dir, '.strix/.gitignore') === 'other-file\nlocal.yaml\n' && r.code === 0);
  check('refreshing local.yaml prints nothing into the context', !r.out.includes('wrote:'), r.out.slice(-300));

  // A plugin path with " #" in it is recorded once, not rewritten every session.
  const oddRoot = join(mkdtempSync(join(tmpdir(), 'strix-hook-root-')), 'a #b');
  temps.push(join(oddRoot, '..'));
  symlinkSync(ROOT, oddRoot);
  const oddDir = project({ '.strix/config.yaml': 'schema: 1\nexecutor: cline\n', ...KNOWLEDGE_OK });
  hook(oddDir, { CLAUDE_PLUGIN_ROOT: oddRoot });
  const past = new Date(Date.now() - 3600_000);
  utimesSync(join(oddDir, '.strix/local.yaml'), past, past);
  hook(oddDir, { CLAUDE_PLUGIN_ROOT: oddRoot });
  check('a plugin path containing " #" is not rewritten every session',
    statSync(join(oddDir, '.strix/local.yaml')).mtimeMs === past.getTime(), read(oddDir, '.strix/local.yaml'));

  // A root that is not the Strix plugin is never recorded, and never breaks the hook.
  const elsewhere = mkdtempSync(join(tmpdir(), 'strix-hook-empty-'));
  temps.push(elsewhere);
  const strayDir = project({ '.strix/config.yaml': 'schema: 1\nexecutor: cline\n', ...KNOWLEDGE_OK });
  const stray = hook(strayDir, { CLAUDE_PLUGIN_ROOT: elsewhere });
  check('a CLAUDE_PLUGIN_ROOT without Strix does not break the hook', stray.code === 0 && stray.err === '', stray.err);
  check('a CLAUDE_PLUGIN_ROOT without Strix is not recorded', !existsSync(join(strayDir, '.strix/local.yaml')));

  // A read-only .strix/ cannot take local.yaml; say so instead of failing quietly.
  // .gitignore already lists local.yaml, so only the local.yaml write can fail.
  const locked = project({ '.strix/config.yaml': 'schema: 1\nexecutor: cline\n', '.strix/.gitignore': 'local.yaml\n', ...KNOWLEDGE_OK });
  chmodSync(join(locked, '.strix'), 0o555);
  const ro = hook(locked);
  chmodSync(join(locked, '.strix'), 0o755);
  check('a read-only .strix/ still gets the contract', ro.code === 0 && ro.out.includes('# Strix Operating Contract'), ro.err);
  check('a failed local.yaml write is reported', /warning: .*local\.yaml/i.test(ro.out), ro.out.slice(-400));

  const bare = project({ '.strix/config.yaml': 'schema: 1\nexecutor: cline\n', ...KNOWLEDGE_OK });
  const noRoot = hook(bare, {});
  check('without CLAUDE_PLUGIN_ROOT the hook still succeeds', noRoot.code === 0, noRoot.err);
  check('without CLAUDE_PLUGIN_ROOT nothing is recorded', !existsSync(join(bare, '.strix/local.yaml')));
}

/* ── report ──────────────────────────────────────────────────────────── */

for (const dir of temps) rmSync(dir, { recursive: true, force: true });

if (failures) {
  console.error(`\n✗ ${failures} of ${checks} hook check(s) failed`);
  process.exit(1);
}
console.log(`\n✓ hook: ${checks} checks passed`);
