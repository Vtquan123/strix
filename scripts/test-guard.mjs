#!/usr/bin/env node
/**
 * Test for hooks/strix-guard.sh, the PreToolUse guardrail.
 *
 * Feeds the hook the JSON Claude Code sends before a tool call and checks the
 * permission decision it prints (or its silence, which lets the call through).
 *
 *   node scripts/test-guard.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './lib/config.mjs';

const GUARD = join(ROOT, 'hooks', 'strix-guard.sh');

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks++;
  if (condition) return;
  failures++;
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
}

const temps = [];
function dir(withStrix) {
  const d = mkdtempSync(join(tmpdir(), 'strix-guard-'));
  temps.push(d);
  if (withStrix) mkdirSync(join(d, '.strix'));
  return d;
}

/** Run the guard; returns the decision ('deny' | 'ask' | null), its reason, and raw output. */
function guard(project, input, rawStdin) {
  const r = spawnSync('bash', [GUARD], {
    encoding: 'utf8',
    input: rawStdin ?? JSON.stringify({ hook_event_name: 'PreToolUse', cwd: project, ...input }),
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CLAUDE_PROJECT_DIR: project },
  });
  let decision = null;
  let reason = '';
  if (r.stdout.trim()) {
    try {
      const out = JSON.parse(r.stdout).hookSpecificOutput;
      decision = out.permissionDecision;
      reason = out.permissionDecisionReason ?? '';
      if (out.hookEventName !== 'PreToolUse') decision = `bad event name ${out.hookEventName}`;
    } catch {
      decision = `unparseable: ${r.stdout}`;
    }
  }
  return { code: r.status, decision, reason, err: r.stderr };
}

const EXECUTOR = { agent_id: 'a1', agent_type: 'strix-executor' };
const edit = (file_path, extra = {}) => ({ tool_name: 'Edit', tool_input: { file_path, old_string: 'a', new_string: 'b' }, ...extra });
const bash = (command, extra = {}) => ({ tool_name: 'Bash', tool_input: { command }, ...extra });

console.log('activation');
{
  const plain = dir(false);
  const r = guard(plain, edit(join(plain, 'src/app.js')));
  check('a project without .strix/ is left alone', r.code === 0 && r.decision === null && r.err === '', JSON.stringify(r));
  const bad = guard(dir(true), {}, 'not json');
  check('malformed input never blocks and never errors', bad.code === 0 && bad.decision === null && bad.err === '', JSON.stringify(bad));
}

console.log('executor file edits');
{
  const p = dir(true);
  for (const [label, path] of [
    ['knowledge', join(p, '.strix/knowledge/architecture.md')],
    ['a task file', join(p, '.strix/tasks/active/general/TASK-001-x.md')],
    ['the config', join(p, '.strix/config.yaml')],
    ['a relative path', '.strix/knowledge/glossary.md'],
    ['a path that walks back in', join(p, 'src/../.strix/knowledge/x.md')],
  ]) {
    const r = guard(p, edit(path, EXECUTOR));
    check(`the executor is denied editing ${label}`, r.decision === 'deny' && /\.strix/.test(r.reason), JSON.stringify(r));
  }
  const write = guard(p, { tool_name: 'Write', tool_input: { file_path: join(p, '.strix/knowledge/new.md'), content: 'x' }, ...EXECUTOR });
  check('Write is guarded like Edit', write.decision === 'deny');
  const multi = guard(p, { tool_name: 'MultiEdit', tool_input: { file_path: join(p, '.strix/knowledge/x.md'), edits: [] }, ...EXECUTOR });
  check('MultiEdit is guarded like Edit', multi.decision === 'deny');
  const nb = guard(p, { tool_name: 'NotebookEdit', tool_input: { notebook_path: join(p, '.strix/knowledge/x.ipynb') }, ...EXECUTOR });
  check('NotebookEdit is guarded like Edit', nb.decision === 'deny');
  const lookalikeAgent = guard(p, edit(join(p, 'src/app.js'), { agent_id: 'z', agent_type: 'not-strix-executor' }));
  check('an agent whose name only ends in strix-executor is not the executor', lookalikeAgent.decision === 'ask', JSON.stringify(lookalikeAgent));
  const namespaced = guard(p, edit(join(p, '.strix/knowledge/x.md'), { agent_id: 'a', agent_type: 'strix:strix-executor' }));
  check('a namespaced executor agent type is recognised', namespaced.decision === 'deny');

  const source = guard(p, edit(join(p, 'src/app.js'), EXECUTOR));
  check('the executor edits source freely', source.decision === null, JSON.stringify(source));
  const shared = dir(false);
  mkdirSync(join(shared, 'knowledge'));
  const linked = dir(false);
  symlinkSync(shared, join(linked, '.strix'));
  const viaLink = guard(linked, edit(join(linked, '.strix/knowledge/a.md'), EXECUTOR));
  check('a .strix/ that is a symlink is still guarded', viaLink.decision === 'deny', JSON.stringify(viaLink));
  mkdirSync(join(p, '.strix', 'knowledge'), { recursive: true });
  mkdirSync(join(p, 'docs'));
  symlinkSync(join(p, '.strix', 'knowledge'), join(p, 'docs', 'kb'));
  const intoStrix = guard(p, edit(join(p, 'docs/kb/a.md'), EXECUTOR));
  check('a symlink into .strix/ from elsewhere is still guarded', intoStrix.decision === 'deny', JSON.stringify(intoStrix));
  const nullInput = guard(p, {}, 'null');
  check('a JSON null input is ignored quietly', nullInput.code === 0 && nullInput.decision === null && nullInput.err === '', JSON.stringify(nullInput));
  const lookalike = guard(p, edit(join(p, '.strixrc'), EXECUTOR));
  check('a file merely starting with .strix is not .strix/', lookalike.decision === null, JSON.stringify(lookalike));
}

console.log('planning edits');
{
  const p = dir(true);
  const main = guard(p, edit(join(p, 'src/app.js')));
  check('the main session is asked before editing source', main.decision === 'ask' && /task/.test(main.reason), JSON.stringify(main));
  const knowledge = guard(p, edit(join(p, '.strix/knowledge/architecture.md')));
  check('the main session edits .strix/ freely', knowledge.decision === null, JSON.stringify(knowledge));
  const outside = guard(p, edit('/tmp/elsewhere/notes.md'));
  check('files outside the project are not the guard\'s business', outside.decision === null, JSON.stringify(outside));
  const creator = guard(p, edit(join(p, 'src/app.js'), { agent_id: 'b', agent_type: 'strix:task-creator-agent' }));
  check('a planning agent is asked before editing source', creator.decision === 'ask', JSON.stringify(creator));
  for (const skillFile of ['.claude/skills/react/SKILL.md', '.claude/skills/README.md', '.clinerules/skills/README.md', '.github/skills/README.md']) {
    const r = guard(p, edit(join(p, skillFile)));
    check(`skill-manager may edit ${skillFile} without a prompt`, r.decision === null, JSON.stringify(r));
  }
  const rules = guard(p, edit(join(p, '.clinerules/identity.md')));
  check('executor rules outside the skill folders still prompt', rules.decision === 'ask', JSON.stringify(rules));
  const other = guard(p, edit(join(p, 'src/app.js'), { agent_id: 'c', agent_type: 'general-purpose' }));
  check('any non-executor agent is asked before editing source', other.decision === 'ask', JSON.stringify(other));
}

console.log('executor board commands');
{
  const p = dir(true);
  const allowed = [
    '.strix/bin/strix-task move TASK-001 review',
    '.strix/bin/strix-task move TASK-001 queue --reason "needs an ADR"',
    '.strix/bin/strix-task note TASK-001 --section "Execution Report" --text "ok"',
    'strix-task where TASK-001',
    'npm test && .strix/bin/strix-task check TASK-001',
    '.strix/bin/strix-task --board .strix/tasks diff TASK-001',
    'echo strix-task-notes > /dev/null',
    'grep -n move .strix/bin/strix-task README.md',
    '.strix/bin/strix-task move TASK-001 \\\nreview',
    'cat .strix/bin/strix-task',
    '(cd app && .strix/bin/strix-task move TASK-001 review --by executor)',
    '(cd app && .strix/bin/strix-task move TASK-001 review)',
    '.strix/bin/strix-task move TASK-001 review>/dev/null',
    "git commit -F - <<'EOF'\nfix parser\n\nstrix-task move TASK-001 done is next\nEOF",
    "cat > notes.md <<EOF\nstrix-task move TASK-001 done\nEOF",
    '.strix/bin/strix-task note TASK-001 --section "Execution Report" --text "then: strix-task move TASK-001 done"',
    'git commit -m "fix\n\nStrix-Task: TASK-001"',
  ];
  for (const command of allowed) {
    const r = guard(p, bash(command, EXECUTOR));
    check(`the executor may run: ${command.split('\n')[0]}`, r.decision === null, JSON.stringify(r));
  }
  const denied = [
    '.strix/bin/strix-task move TASK-001 done',
    '.strix/bin/strix-task move TASK-001 active',
    '.strix/bin/strix-task --board .strix/tasks move TASK-001 archive',
    'npm test && .strix/bin/strix-task move TASK-001 done',
    'npm test; strix-task move TASK-001 done',
    '.strix/bin/strix-task move TASK-001 review --override "just because"',
    '.strix/bin/strix-task new general --title "More work"',
    '.strix/bin/strix-task workstream add x --prefix X --owner me',
    'bash .strix/bin/strix-task migrate',
    '.strix/bin/strix-task --x note move TASK-001 done',
    'sh -c ".strix/bin/strix-task move TASK-001 done"',
    'bash -lc \'npm test && strix-task move TASK-001 done\'',
    'echo done | xargs .strix/bin/strix-task move TASK-001',
    'env STRIX_ACTOR=x .strix/bin/strix-task move TASK-001 done',
    'STRIX_ACTOR=x .strix/bin/strix-task move TASK-001 done',
    'node /plugin/bin/strix-task.mjs move TASK-001 done',
    'cd app && ./.strix/bin/strix-task move TASK-001 done',
    'echo "$(.strix/bin/strix-task move TASK-001 done)"',
    'echo `strix-task move TASK-001 done`',
    '(strix-task move TASK-001 done)',
    '{ strix-task move TASK-001 done; }',
    'if .strix/bin/strix-task move TASK-001 done; then echo ok; fi',
    '! strix-task move TASK-001 done',
    'for i in 1; do strix-task move TASK-001 done; done',
    'sudo -u root strix-task move TASK-001 done',
    'env -u X strix-task move TASK-001 done',
    'nice -n 5 strix-task move TASK-001 done',
    'timeout 5 strix-task move TASK-001 done',
    'eval "strix-task move TASK-001 done"',
    'xargs -n 1 strix-task move TASK-001 < ids.txt',
    'cat <<EOF > x\nhi\nEOF\nstrix-task move TASK-001 done',
    'echo "x <<EOF"\nstrix-task move TASK-001 done',
    "echo 'a<<B'\nstrix-task move TASK-001 done\nB",
  ];
  for (const command of denied) {
    const r = guard(p, bash(command, EXECUTOR));
    check(`the executor may not run: ${command}`, r.decision === 'deny' && /strix-task/.test(r.reason), JSON.stringify(r));
  }
  const main = guard(p, bash('.strix/bin/strix-task move TASK-001 done'));
  check('the main session may make any move', main.decision === null, JSON.stringify(main));
}

for (const d of temps) rmSync(d, { recursive: true, force: true });

if (failures) {
  console.error(`\n✗ ${failures} of ${checks} guard check(s) failed`);
  process.exit(1);
}
console.log(`\n✓ guard: ${checks} checks passed`);
