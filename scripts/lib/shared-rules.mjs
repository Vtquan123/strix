/**
 * The executor rules have one source, templates/executors/_shared/, rendered
 * per executor by scripts/gen-docs.mjs. The template language is deliberately
 * tiny:
 *
 *   {{Name}}                   a variable from the executor's vars
 *   {{#claude}}...{{/claude}}  kept only for the executor `claude`
 *   {{^claude}}...{{/claude}}  kept for every executor except `claude`
 *
 * A block whose tags sit on their own lines drops those lines entirely, and
 * blocks may nest. Fenced code blocks are left alone, so a shared file can show
 * the syntax. Anything left in double braces afterwards is an error, not output.
 */

const FENCE = /^\s{0,3}(```|~~~)/;

/** Line indexes that sit inside a fenced code block. */
function fencedLines(lines) {
  const inside = new Set();
  let fence = null;
  lines.forEach((line, i) => {
    const m = line.match(FENCE);
    if (fence) {
      inside.add(i);
      if (m && m[1][0] === fence[0]) fence = null;
    } else if (m) {
      fence = m[1];
      inside.add(i);
    }
  });
  return inside;
}

/** One pass of line-form blocks, outermost first. Returns null when none match. */
function lineBlockPass(text, keep) {
  const lines = text.split('\n');
  const fenced = fencedLines(lines);
  for (let i = 0; i < lines.length; i++) {
    const open = fenced.has(i) ? null : lines[i].match(/^\{\{([#^])([a-z][a-z0-9-]*)\}\}$/);
    if (!open) continue;
    let depth = 1;
    for (let j = i + 1; j < lines.length; j++) {
      if (fenced.has(j)) continue;
      if (lines[j] === `{{#${open[2]}}}` || lines[j] === `{{^${open[2]}}}`) depth++;
      else if (lines[j] === `{{/${open[2]}}}`) depth--;
      if (depth === 0) {
        const body = keep(open[1], open[2]) ? lines.slice(i + 1, j) : [];
        return [...lines.slice(0, i), ...body, ...lines.slice(j + 1)].join('\n');
      }
    }
    throw new Error(`unclosed block {{${open[1]}${open[2]}}}`);
  }
  return null;
}

/** Render a shared rules file for one executor. */
export function renderShared(text, executor, vars) {
  const keep = (kind, id) => (id === executor) === (kind === '#');
  let out = text.replace(/\r\n?/g, '\n');
  // Repeat until stable: removing an outer block exposes the blocks it held.
  for (let next = lineBlockPass(out, keep); next !== null; next = lineBlockPass(out, keep)) out = next;
  // Inline blocks, skipping fenced code so the syntax can be documented.
  const lines = out.split('\n');
  const fenced = fencedLines(lines);
  out = lines
    .map((line, i) =>
      fenced.has(i)
        ? line
        : line.replace(/\{\{([#^])([a-z][a-z0-9-]*)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (_m, kind, id, body) =>
            keep(kind, id) ? body : '',
          ),
    )
    .join('\n');
  const varLines = out.split('\n');
  const varFenced = fencedLines(varLines);
  out = varLines
    .map((line, i) =>
      varFenced.has(i)
        ? line
        : line.replace(/\{\{([A-Za-z]+)\}\}/g, (m, key) => {
            if (!(key in vars)) throw new Error(`unknown variable ${m}`);
            return vars[key];
          }),
    )
    .join('\n');
  // A tag left outside a fence means the template is wrong, not documentation.
  const rest = out.split('\n');
  const restFenced = fencedLines(rest);
  for (const [i, line] of rest.entries()) {
    const left = restFenced.has(i) ? null : line.match(/\{\{[^}]*\}\}/);
    if (left) throw new Error(`unrendered template tag ${left[0]}`);
  }
  return out;
}

/**
 * One `## <heading>` section's body (a heading that equals `heading` or starts
 * with it plus a space), trimmed. With heading null: the whole document minus
 * its `# ` title, every heading demoted one level, for embedding under a `##`.
 * Headings inside fenced code blocks are text, not structure.
 */
export function sharedSection(text, heading) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\s+$/, '').split('\n');
  const fenced = fencedLines(lines);
  if (heading === null) {
    const start = lines[0].startsWith('# ') ? 1 : 0;
    return lines
      .slice(start)
      .map((l, i) => (!fenced.has(i + start) && /^#{2,5} /.test(l) ? `#${l}` : l))
      .join('\n')
      .trim();
  }
  const start = lines.findIndex(
    (l, i) => !fenced.has(i) && (l === `## ${heading}` || l.startsWith(`## ${heading} `)),
  );
  if (start === -1) throw new Error(`no "## ${heading}" section`);
  let end = start + 1;
  while (end < lines.length && !(lines[end].startsWith('## ') && !fenced.has(end))) end++;
  return lines.slice(start + 1, end).join('\n').trim();
}
