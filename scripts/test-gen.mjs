#!/usr/bin/env node
/**
 * Tests for the shared executor-rule renderer (scripts/lib/shared-rules.mjs)
 * and for the generator's drift gate.
 *
 *   node scripts/test-gen.mjs
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './lib/config.mjs';
import { renderShared, sharedSection } from './lib/shared-rules.mjs';

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks++;
  if (condition) return;
  failures++;
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
}

const throws = (fn) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

const VARS = { Title: 'Cline', Name: 'Cline', name: 'Cline', Heading: 'Cline' };

console.log('renderShared');
{
  check('variables are substituted', renderShared('# {{Title}} Rules\n{{name}} reads.\n', 'cline', VARS) === '# Cline Rules\nCline reads.\n');
  check('an unknown variable is an error', throws(() => renderShared('{{Nope}}\n', 'cline', VARS)));
  check('a leftover brace pair is an error', throws(() => renderShared('{{#cline}}open only\n', 'cline', VARS)));

  const block = 'a\n{{#claude}}\nclaude only\n{{/claude}}\n{{^claude}}\nnot claude\n{{/claude}}\nz\n';
  check('a block for another executor is dropped', renderShared(block, 'cline', VARS) === 'a\nnot claude\nz\n', JSON.stringify(renderShared(block, 'cline', VARS)));
  check('a block for this executor is kept', renderShared(block, 'claude', VARS) === 'a\nclaude only\nz\n', JSON.stringify(renderShared(block, 'claude', VARS)));

  const nested = '{{#claude}}\nouter\n{{^cline}}\ninner\n{{/cline}}\n{{/claude}}\n';
  check('nested blocks leave no blank lines', renderShared(nested, 'claude', VARS) === 'outer\ninner\n', JSON.stringify(renderShared(nested, 'claude', VARS)));
  const crlf = 'a\r\n{{#claude}}\r\nX\r\n{{/claude}}\r\nz\r\n';
  check('CRLF input renders without stray lines', renderShared(crlf, 'cline', VARS) === 'a\nz\n', JSON.stringify(renderShared(crlf, 'cline', VARS)));
  const fenced = '```\n{{#claude}}\nliteral\n{{/claude}}\n```\n';
  check('a block inside a code fence is left alone', renderShared(fenced, 'cline', VARS) === fenced, JSON.stringify(renderShared(fenced, 'cline', VARS)));

  const fencedVar = '```\n{{Nope}}\n```\n';
  check('a variable inside a code fence is left alone', renderShared(fencedVar, 'cline', VARS) === fencedVar);

  const inline = 'Strix{{#claude}}, as a subagent{{/claude}}.\n';
  check('inline blocks work', renderShared(inline, 'claude', VARS) === 'Strix, as a subagent.\n' && renderShared(inline, 'cline', VARS) === 'Strix.\n');
}

console.log('sharedSection');
{
  const doc = '# T\n\nIntro.\n\n## Rules\n\n1. one\n\n## Stop Conditions (escalate)\n\n- a\n### Deep\n- b\n';
  check('a section body is extracted without its heading', sharedSection(doc, 'Rules') === '1. one', JSON.stringify(sharedSection(doc, 'Rules')));
  check('a heading prefix selects a section', sharedSection(doc, 'Stop Conditions') === '- a\n### Deep\n- b');
  check('a missing section is an error', throws(() => sharedSection(doc, 'Nope')));
  const fencedDoc = '# T\n\n## A\n\nx\n```\n## B\n```\n\n## C\n\ny\n';
  check('a heading inside a fence does not end a section', sharedSection(fencedDoc, 'A') === 'x\n```\n## B\n```', JSON.stringify(sharedSection(fencedDoc, 'A')));
  check('the whole body leaves fenced headings alone', sharedSection(fencedDoc, null).includes('\n## B\n'), JSON.stringify(sharedSection(fencedDoc, null)));
  check('the whole body drops the title and demotes headings',
    sharedSection(doc, null) === 'Intro.\n\n### Rules\n\n1. one\n\n### Stop Conditions (escalate)\n\n- a\n#### Deep\n- b', JSON.stringify(sharedSection(doc, null)));
}

console.log('drift gate');
let copy;
const sentinel = mkdtempSync(join(tmpdir(), 'strix-gen-'));
try {
  // A hand edit to a generated executor rule file must fail `gen --check`.
  // The copy is an allowlist taken from disk, not from git: it holds in a
  // tarball, and local clutter (.strix/, .vscode/, coverage/) cannot break it.
  copy = mkdtempSync(join(tmpdir(), 'strix-gen-'));
  const COPY = [
    '.claude-plugin', '.github', 'agents', 'bin', 'commands', 'config', 'docs', 'hooks',
    'lib', 'reference', 'scripts', 'skills', 'templates',
    'README.md', 'LICENSE', 'package.json', 'package-lock.json',
  ];
  for (const entry of COPY) {
    if (existsSync(join(ROOT, entry))) cpSync(join(ROOT, entry), join(copy, entry), { recursive: true });
  }
  check('the copy holds every tracked top-level directory', COPY.filter((e) => !existsSync(join(copy, e))).length === 0);
  symlinkSync(join(ROOT, 'node_modules'), join(copy, 'node_modules'));
  const gen = (...args) => spawnSync(process.execPath, [join(copy, 'scripts', 'gen-docs.mjs'), ...args], { encoding: 'utf8' });
  check('the scratch copy has the generator', existsSync(join(copy, 'scripts', 'gen-docs.mjs')));

  check('a clean copy passes the drift gate', gen('--check').status === 0, gen('--check').stderr);
  const target = join(copy, 'templates/executors/cline/.clinerules/execution.md');
  writeFileSync(target, `${readFileSync(target, 'utf8')}\nhand edit\n`);
  const stale = gen('--check');
  check('a hand-edited generated rule file fails the gate', stale.status === 1 && stale.stderr.includes('.clinerules/execution.md'), stale.stderr);
  gen();
  check('npm run gen restores it', !readFileSync(target, 'utf8').includes('hand edit'));

  // A stray region in a file outside TARGETS must fail, dotted ids included.
  for (const [name, id] of [
    ['reference/docs/stray-plain.md', 'routing-table'],
    ['reference/docs/stray-shared.md', 'shared.execution.rules'],
    ['templates/executors/copilot/.github/stray-copilot.md', 'shared.coding'],
  ]) {
    const stray = join(copy, name);
    writeFileSync(stray, `<!-- strix:gen start id=${id} -->\n<!-- strix:gen end id=${id} -->\n`);
    const r = gen('--check');
    check(`a stray "${id}" region in ${name} fails the gate`, r.status === 1 && r.stderr.includes(name), r.stderr);
    rmSync(stray);
  }

  // An extra hand-written file inside a generated rules directory must fail.
  const bogus = join(copy, 'templates/executors/cline/.clinerules/bogus.md');
  writeFileSync(bogus, 'junk\n');
  const extra = gen('--check');
  check('an ungenerated file in a generated rules directory fails the gate', extra.status === 1 && extra.stderr.includes('bogus.md'), extra.stderr);
  rmSync(bogus);

  const prompt = join(copy, 'templates/executors/copilot/.github/prompts/fix.prompt.md');
  writeFileSync(prompt, readFileSync(prompt, 'utf8').replace('**Reproduce**', '**Reproduce (edited)**'));
  check('a hand-edited Copilot region fails the gate', gen('--check').status === 1);
} finally {
  // Only this run's copy: a parallel run's fixture must survive.
  if (copy) rmSync(copy, { recursive: true, force: true });
}
check('cleanup leaves another run\'s temp dir alone', existsSync(sentinel));
rmSync(sentinel, { recursive: true, force: true });

if (failures) {
  console.error(`\n✗ ${failures} of ${checks} gen check(s) failed`);
  process.exit(1);
}
console.log(`\n✓ gen: ${checks} checks passed`);
