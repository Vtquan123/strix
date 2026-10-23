/**
 * PreToolUse guardrail for Strix, run through hooks/strix-guard.sh.
 *
 * Claude Code sends the pending tool call as JSON on stdin. The guard answers
 * with a permission decision on stdout, or prints nothing to let the call
 * through. Rules:
 *
 *   - The strix-executor subagent never edits anything under .strix/: knowledge
 *     is read-only to it, and task files change only through strix-task.
 *   - The strix-executor subagent runs only the strix-task commands its role
 *     needs: `move <ID> review|queue`, `note`, and the read-only ones. No
 *     `--override`.
 *   - Every other Claude (the main session, the planning agents) is asked to
 *     confirm before editing a project file outside .strix/: implementation is
 *     the executor's job. Skill folders are exempt, since skill-manager keeps them.
 *
 * This is a guardrail against mistakes, not a security boundary: a shell
 * command can still write a file. Anything unexpected lets the call through.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];
// strix-task subcommands the executor may run; `move` is limited further below.
const EXECUTOR_COMMANDS = ['move', 'note', 'where', 'check', 'ls', 'next', 'diff', 'doctor', 'help'];
const EXECUTOR_MOVES = ['review', 'queue'];
// strix-task's own boolean flags. Like its parser, every other `--flag` takes
// the next word as its value, so the two always agree on the subcommand.
const BOOLEAN_FLAGS = ['help', 'lite'];
const CLI_NAMES = ['strix-task', 'strix-task.mjs'];
// Every strix-task subcommand: a strix-task word followed by one is a call,
// wherever it sits, which covers wrappers and shell syntax the parser below
// does not model.
const CLI_COMMANDS = ['new', 'move', 'note', 'check', 'next', 'diff', 'where', 'ls', 'workstream', 'doctor', 'migrate', 'help'];
// Words that run the command after them.
const WRAPPERS = ['env', 'command', 'exec', 'nohup', 'time', 'nice', 'sudo', 'xargs', 'timeout', 'stdbuf', 'caffeinate'];
const KEYWORDS = ['if', 'then', 'elif', 'else', 'do', 'while', 'until', '!'];
const SHELLS = ['sh', 'bash', 'zsh', 'dash', 'ksh'];
const RUNTIMES = ['node', 'bun', 'deno'];

function decide(permissionDecision, permissionDecisionReason) {
  process.stdout.write(
    `${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason } })}\n`,
  );
  process.exit(0);
}

/** The real path, resolving symlinks through the deepest part that exists. */
function realish(path) {
  let head = path;
  const tail = [];
  while (!existsSync(head)) {
    const parent = dirname(head);
    if (parent === head) return path;
    tail.unshift(basename(head));
    head = parent;
  }
  try {
    return join(realpathSync.native(head), ...tail);
  } catch {
    return path;
  }
}

/**
 * Split a shell command into simple commands, each a list of words. Quotes are
 * honoured; `;`, `&`, `|`, and newlines outside quotes end a command. Enough to
 * find a strix-task invocation, not a full shell parser.
 */
function simpleCommands(command) {
  const commands = [[]];
  let word = null;
  let quote = null;
  // The word after a redirection is a file name, not an argument.
  let redirectTarget = false;
  const end = () => {
    if (word !== null) {
      if (redirectTarget) redirectTarget = false;
      else commands[commands.length - 1].push(word);
    }
    word = null;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    // A backslash-newline is a line continuation: it joins, it adds nothing.
    if (c === '\\' && command[i + 1] === '\n' && quote !== "'") {
      i++;
      continue;
    }
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < command.length) word += command[++i];
      else word += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      word ??= '';
    } else if (c === '\\' && i + 1 < command.length) {
      word = (word ?? '') + command[++i];
    } else if (/\s/.test(c) && c !== '\n') {
      end();
    } else if (c === '<' || c === '>') {
      end();
      while (command[i + 1] === '<' || command[i + 1] === '>') i++;
      redirectTarget = true;
    } else if (c === ';' || c === '&' || c === '|' || c === '\n') {
      end();
      redirectTarget = false;
      if (commands[commands.length - 1].length) commands.push([]);
    } else {
      word = (word ?? '') + c;
    }
  }
  end();
  return commands.filter((c) => c.length);
}

/** Why the executor may not run this strix-task invocation, or null if it may. */
function executorBoardViolation(args) {
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--override')) return '`--override` is the orchestrator\'s decision, never the executor\'s';
    if (a === '-h') continue;
    if (a.startsWith('--')) {
      if (!BOOLEAN_FLAGS.includes(a.slice(2))) i++;
      continue;
    }
    positional.push(a);
  }
  const [sub, , stage] = positional;
  if (!sub) return null;
  if (!EXECUTOR_COMMANDS.includes(sub)) return `\`strix-task ${sub}\` is not the executor's to run`;
  if (sub === 'move' && !EXECUTOR_MOVES.includes(stage)) {
    return `the executor moves a task only to review (done) or queue (escalation), not to ${stage ?? 'an unstated stage'}`;
  }
  return null;
}

/** Whether position `at` of a line falls inside a quoted string. */
function insideQuotes(line, at) {
  let quote = null;
  for (let i = 0; i < at; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"') i++;
    } else if (c === "'" || c === '"') quote = c;
    else if (c === '\\') i++;
  }
  return quote !== null;
}

/** The command with heredoc bodies removed: they are data, not commands. */
function stripHeredocs(command) {
  const out = [];
  const pending = [];
  for (const line of command.split('\n')) {
    if (pending.length) {
      const { word, tabs } = pending[0];
      if ((tabs ? line.replace(/^\t+/, '') : line) === word) pending.shift();
      continue;
    }
    out.push(line);
    for (const m of line.matchAll(/(?<!<)<<(?!<)(-?)\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\2/g)) {
      // A `<<` inside quotes (`echo "a <<EOF"`) starts no heredoc.
      if (!insideQuotes(line, m.index)) pending.push({ word: m[3], tabs: m[1] === '-' });
    }
  }
  return out.join('\n');
}

/** The first positional argument strix-task would read, parsed its way. */
function firstPositional(args) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-h') continue;
    if (a.startsWith('--')) {
      if (!BOOLEAN_FLAGS.includes(a.slice(2))) i++;
      continue;
    }
    return a;
  }
  return undefined;
}

/**
 * Every strix-task invocation inside a shell command, as its argument list.
 * Only a word in command position counts, so `grep strix-task README.md` does
 * not; wrappers, `VAR=value` prefixes, `sh -c '...'`, `$(...)`, and backticks
 * are looked through.
 */
function strixInvocations(command, depth = 0) {
  if (depth > 4) return [];
  command = stripHeredocs(command);
  const found = [];
  // Command substitutions are commands of their own.
  for (const m of command.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)) found.push(...strixInvocations(m[1] ?? m[2], depth + 1));

  for (let words of simpleCommands(command)) {
    words = words.map((w) => w.replace(/^[({]+/, '').replace(/[)}]+$/, '')).filter(Boolean);
    let i = 0;
    for (;;) {
      const w = words[i];
      if (w === undefined) break;
      const name = basename(w);
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || KEYWORDS.includes(w)) i++;
      else if (name === 'eval') {
        found.push(...strixInvocations(words.slice(i + 1).join(' '), depth + 1));
        i = words.length;
      } else if (WRAPPERS.includes(name)) {
        i++;
        while (words[i]?.startsWith('-')) i++;
      } else if (SHELLS.includes(name) || RUNTIMES.includes(name)) {
        const flagC = words.slice(i + 1).findIndex((x) => /^-[a-z]*c[a-z]*$/.test(x));
        if (SHELLS.includes(name) && flagC !== -1) {
          found.push(...strixInvocations(words[i + 2 + flagC] ?? '', depth + 1));
          i = words.length;
        } else {
          i++;
          while (words[i]?.startsWith('-')) i++;
        }
      } else break;
    }
    if (i < words.length && CLI_NAMES.includes(basename(words[i]))) {
      found.push(words.slice(i + 1));
      continue;
    }
    // Fallback for wrappers with option values (`sudo -u root`, `nice -n 5`) and
    // anything else in front: a strix-task word followed by a real subcommand.
    for (let j = 0; j < words.length; j++) {
      if (CLI_NAMES.includes(basename(words[j])) && CLI_COMMANDS.includes(firstPositional(words.slice(j + 1)))) {
        found.push(words.slice(j + 1));
        break;
      }
    }
  }
  return found;
}

/** Skill folders skill-manager maintains, from the plugin's executor catalog. */
function skillDirs() {
  const dirs = ['.claude/skills'];
  try {
    const catalog = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'config', 'executors.yaml'), 'utf8');
    for (const m of catalog.matchAll(/^\s*skills_dir:\s*(\S+)\s*$/gm)) dirs.push(m[1].replace(/\/+$/, ''));
  } catch {
    // Without the catalog only .claude/skills is exempt; the guard still works.
  }
  return dirs;
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
if (!input || typeof input !== 'object' || Array.isArray(input)) process.exit(0);

const projectLexical = resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
const project = realish(projectLexical);
if (!existsSync(join(project, '.strix'))) process.exit(0);
const strixReal = realish(join(project, '.strix'));

const agentType = typeof input.agent_type === 'string' ? input.agent_type : '';
const isExecutor = /(^|:)strix-executor$/.test(agentType);
const tool = input.tool_name;
const toolInput = input.tool_input ?? {};

if (FILE_TOOLS.includes(tool)) {
  const target = toolInput.file_path ?? toolInput.notebook_path;
  if (typeof target !== 'string' || !target) process.exit(0);
  const within = (base, path) => {
    const r = relative(base, path);
    return r !== '' && !r.startsWith('..') && !isAbsolute(r) ? r : null;
  };
  // Judge both the path as written and where it really points, so a symlinked
  // .strix/ (or a symlink into it) is still .strix/.
  const lexical = resolve(input.cwd || projectLexical, target);
  const real = realish(lexical);
  const rel = within(projectLexical, lexical) ?? within(project, real);
  if (!rel && !within(strixReal, real) && real !== strixReal) process.exit(0);
  const underStrix =
    (rel !== null && (rel === '.strix' || rel.startsWith(`.strix${sep}`))) || real === strixReal || within(strixReal, real) !== null;
  const inSkills = rel !== null && skillDirs().some((d) => rel === d || rel.startsWith(`${d}${sep}`));

  if (isExecutor && underStrix) {
    decide(
      'deny',
      `Strix: the executor never edits .strix/ (${rel}). Knowledge is read-only to it; ` +
        'record results with `.strix/bin/strix-task note <ID> --section "Execution Report"`, ' +
        'and escalate anything else with `strix-task move <ID> queue --reason "..."`.',
    );
  }
  if (!isExecutor && !underStrix && !inSkills) {
    decide(
      'ask',
      `Strix: ${rel} is a project file outside .strix/, and implementation belongs to the executor. ` +
        'Write a task instead (`.strix/bin/strix-task new ...`), unless the user asked for this edit directly.',
    );
  }
  process.exit(0);
}

if (tool === 'Bash' && isExecutor && typeof toolInput.command === 'string') {
  for (const args of strixInvocations(toolInput.command)) {
    const why = executorBoardViolation(args);
    if (why) decide('deny', `Strix: ${why}. Blocked strix-task command: strix-task ${args.join(' ')}`);
  }
}

process.exit(0);
