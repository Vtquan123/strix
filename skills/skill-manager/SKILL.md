---
name: skill-manager
description: Install, update, or remove skills from the skills.sh registry (Vercel Labs `npx skills`) into the CURRENT PROJECT — reasoning skills into the project's .claude/skills/, implementation skills into the project's .clinerules/skills/ — giving each project its own skills alongside Strix's built-in plugin skills. Use when a request asks to add or find a skill from skills.sh, install a skill by owner/repo or a direct link, or update/delete a skills.sh-installed skill — e.g. "add a react skill", "install owner/repo --skill x", "update the react skill", "remove the sql skill". Searches the registry, reviews the skill for safety, installs into the chosen project layer, then keeps the project's own catalog consistent.
metadata:
  kind: reasoning
  engine: claude
---

# Skill Manager

## Purpose
Manage the lifecycle of skills sourced from the open-source
[skills.sh](https://www.skills.sh) registry (the Vercel Labs `npx skills` CLI),
installing them **into the current project** — reasoning skills into the
project's `.claude/skills/`, implementation skills into the project's
`.clinerules/skills/` — and keeping the **project's own** catalog consistent.
skills.sh skills already use the open
[Agent Skills format](https://agentskills.io/specification) (one `SKILL.md`,
`name` + `description` frontmatter), so they drop in with minimal conversion.

### Scope: project only — never the plugin
Strix ships its **built-in** reasoning skills inside the installed plugin
(`${CLAUDE_PLUGIN_ROOT}/skills/`, invoked as `strix:<name>`). Those are
**read-only** and off-limits to this skill. skill-manager operates **exclusively
on the working project**:

- Reasoning → `<project>/.claude/skills/<name>/` — auto-discovered by Claude
  Code, invoked by its plain `<name>` (coexists with, and is distinct from, the
  `strix:*` built-ins).
- Implementation → `<project>/.clinerules/skills/<name>/` — loaded by Cline.

**Never** install into, edit, rename, or delete anything under the plugin
directory (`skills/`, `reference/`, root `README.md`, etc.), and never use a
global (`-g`) install. If a user wants to change Strix's *built-in* skills, that
is Strix-plugin development done in the plugin repo itself — out of scope here.

This skill **runs `npx skills` on demand** — a terminal capability shared with Cline per
[runtime-separation.md](../../reference/workflow/runtime-separation.md) and
[permissions.md](../../reference/rules/permissions.md) ("Run terminal / scripts — ask user for
verifying"). Destructive operations (`update`, `remove`) are confirmed with the user first.

Sibling: [cline-skill-handler](../cline-skill-handler/SKILL.md) **authors** a skill's
content from scratch; this skill **pulls ready-made** content from the registry.

## When to use
The Router selects this when a request asks to:
- search/browse skills.sh and add a match — "add a react skill", "find a skill for GraphQL"
- install a specific skill by identifier or link — "install `owner/repo --skill x`",
  a GitHub URL, or `…/tree/main/skills/<name>`
- update a skills.sh-installed skill — "update the react skill"
- remove a skills.sh-installed skill — "delete the sql skill"

## Inputs / Outputs
- **In:** user request; a search query, `owner/repo`, or direct link; the chosen target
  layer; the project's existing `.claude/skills/*` and `.clinerules/skills/*`.
- **Out:** a skill installed/updated/removed under the chosen **project** layer, and the
  project's own catalog kept consistent (below) — or an explicit "no change" when the
  user declines or the security review blocks.

## The `npx skills` CLI
| Command | Purpose |
|---------|---------|
| `npx skills find <query> [--owner <o>]` | Search the registry (see Searching below) |
| `npx skills add <owner/repo> [--skill <name>] [-a <agent>] [--list]` | Install (`--list` previews a repo's skills without installing) |
| `npx skills use <owner/repo> [--skill <name>]` | Preview/activate without installing |
| `npx skills list` / `npx skills ls` | List installed skills |
| `npx skills update [<name>]` | Upgrade installed skill(s) |
| `npx skills remove <name>` / `rm` | Uninstall |

- **Source** accepts `owner/repo`, full GitHub/GitLab URLs, `…/tree/<branch>/skills/<name>`
  deep links, and local paths. `'*'` installs every skill in a repo.
- **Agent flag** picks the target directory in the **project**: `-a claude` →
  `<project>/.claude/skills/`, `-a cline` → `<project>/.clinerules/skills/`.
- Always **project scope** (default; committed with the project). **Never** use `-g`
  (global) — this skill installs per-project only, never machine-wide and never into the
  plugin.

## Choosing the target layer
- **Reasoning** (`-a claude` → project `.claude/skills/`) — how-to-**think** skills:
  planning, review, architecture, domain reasoning. Claude Code auto-discovers them and
  needs only `name` + `description`; optionally add the Strix marker (Procedure step 5).
- **Implementation** (`-a cline` → project `.clinerules/skills/`) — how-to-**build**
  skills: code, test, ship. skills.sh format already matches Cline's.
- If the request doesn't make the layer obvious, **ask the user** before installing.
- Both targets are inside the working project — verify the working directory is that
  project root before running `npx skills`.

## Searching the registry
When a request is a query (not a direct link), search with **`find`**, then read the results
carefully before presenting them.

- **Correct command:** `npx skills find <query>` — optionally narrowed by
  `npx skills find <query> --owner <owner>`. That is the whole surface: `find` takes a query
  and `--owner`, nothing else.
- **Do NOT pass `--list`/`-l` to `find`.** `--list` is an **`add`** flag ("list a repo's
  skills without installing"). `find` silently ignores unknown flags, so
  `npx skills find <query> --list` still returns *something* — but a different, misleading
  result set (not the registry's real popularity ranking). Never append `add` flags to
  `find`; a command that "works" is not proof it did what you meant.
- **Read the output as-is.** `find` prints matches already sorted by **install count,
  descending** — the top row is the most-installed match. Each line is
  `owner/repo@skill  <N> installs` with a `skills.sh/...` URL beneath. Report the counts you
  actually see; don't reorder or infer a ranking the tool didn't give you.
- **Sanity-check before acting.** If the top result has an implausibly low install count for
  a common query, suspect a malformed command (e.g. a stray flag) and re-run the bare
  `find <query>` before presenting candidates.
- **To inspect a specific repo's skills** without installing, that's the `add --list`
  preview (`npx skills add <owner/repo> --list`) or `npx skills use <owner/repo>@<skill>` —
  not `find`.

## Operations / Procedure

**Add (from a query)** — "add a react skill"
1. `npx skills find <query>` (add `--owner <owner>` to narrow) → collect candidates from the
   output as printed: name, `owner/repo@skill`, install count, URL. See **Searching the
   registry** above — never tack `--list` onto `find`.
2. Present the top matches (highest install count first) with `AskUserQuestion` so the user
   picks one; confirm the target layer.
3. **Security review** the chosen skill (see below). Block or confirm per the verdict.
4. `npx skills add <owner/repo> --skill <name> -a <claude|cline>` (project scope; no `-g`).
5. **Optional (`-a claude`):** add the Strix marker to the installed `SKILL.md`
   frontmatter so the project skill is recognizably Strix-managed:
   ```yaml
   metadata:
     kind: reasoning
     engine: claude
   ```
   Claude Code needs only `name`+`description`, so this is a convention marker, not a
   requirement; Cline installs never get it.
6. Update the **project's own** catalog for the chosen layer (below).

**Add (from a direct link)** — user pastes `owner/repo`, a GitHub URL, or a deep link
1. Skip search. Confirm the target layer.
2. Security review → `npx skills add <link> -a <agent>` (project scope) → optional Strix
   marker if `-a claude` → update the project catalog.

**Update** — "update the react skill"
1. Confirm the target skill. `npx skills update <name>` (or `npx skills update` for all).
2. Re-run the security review on the updated content.
3. If it's a `.claude` skill you had marked, **re-apply the optional Strix marker** (an
   update may overwrite the frontmatter).
4. Re-sync the project catalog only if `name`/`description` changed.

**Remove** — "delete the react skill"
1. **Ask the user to confirm** the deletion. If no → stop.
2. `npx skills remove <name>` (from whichever project layer it lives in).
3. Strip the skill from the project catalog; verify no dangling reference remains.

**List** — `npx skills ls`; cross-check against the project catalog (the project's
`.clinerules/skills/README.md`, and `.claude/skills/` on disk) and flag any skill that is
installed but unlisted, or listed but missing.

## Security review (before every install/update)
skills.sh skills are third-party code. Before installing, inspect the skill's `SKILL.md`
and any `scripts/` — preview with `npx skills use …` (or `npx skills add … --copy` to a
temporary location, or read the source repo) — and run the
[risk-analysis](../risk-analysis/SKILL.md) skill over these categories:

1. Malicious command execution (`eval`, `exec`, shell injection, curl-pipe-sh)
2. Backdoors / obfuscation (base64/hex blobs, hidden network calls)
3. Credential theft (`~/.ssh`, `~/.aws`, `~/.netrc`, env-var secrets, keylogging)
4. Network exfiltration (reverse shells, `pastebin`/`ngrok`/`bit.ly`)
5. Filesystem abuse (`rm -rf`, writes to system dirs)
6. Privilege escalation (`sudo`, container escape)
7. Supply-chain attacks (suspicious installs, dynamic imports)

Verdict → **SAFE** (proceed), **WARNING** (surface findings, confirm with the user before
installing), **DANGEROUS** (refuse; do not install). Prefer skills.sh "security-audited"
entries.

## Project catalog to keep in sync
Only the **project's own, writable** files are updated — never any installed-plugin
document. An add / rename / remove touches, **for the layer it changed**:

- **Implementation (`-a cline`)** → the project's `.clinerules/skills/README.md` —
  its "Implementation Skills (Cline)" list. This file was seeded into the project by
  `/strix:init` and is writable.
- **Reasoning (`-a claude`)** → nothing is required: Claude Code auto-discovers
  `.claude/skills/` with no catalog. If the project keeps a `.claude/skills/README.md`
  index, update it; otherwise leave it — do **not** create plugin-style registry docs.

Never edit the Strix plugin's own files (`reference/docs/skills.md`, the plugin
`README.md`, `reference/rules/routing.md`, `reference/docs/router.md`): they are
read-only in a consuming project and describe the built-in skills, not the project's.

## Rules
**Do**
- Always install at **project scope**, into the working project's `.claude/skills/` or
  `.clinerules/skills/`; pick the layer per request and ask when it's ambiguous.
- Run the **security review** before every install and update; block DANGEROUS skills.
- Keep the installed skill's folder name matching its `name` frontmatter.
- Confirm before any `update` or `remove` (destructive), and before installing a
  WARNING-level skill.
- After any add/rename/remove, update the **project's own** catalog for the touched layer
  so it stays accurate — no dangling references.

**Don't**
- **Don't touch the plugin's scope**: never install into, edit, or delete anything under
  the Strix plugin (`skills/`, `reference/`, plugin `README.md`, routing docs). Those are
  read-only and describe the built-in skills, not the project's.
- Don't use `-g`/global — ever; this skill is project-scoped only.
- Don't install a skill that failed the security review; never override a DANGEROUS verdict.
- Don't add `metadata.kind`/`engine` to a **Cline** (`.clinerules/skills/`) install — Cline reads
  only `name`+`description`.
- Don't remove or update a skill without confirming first.
- Don't author skill content here — that's [cline-skill-handler](../cline-skill-handler/SKILL.md);
  this skill pulls ready-made skills from the registry.

## Checklist
- [ ] Working directory confirmed = the target **project** root (not the plugin)
- [ ] Operation identified: add / update / remove / list
- [ ] Target project layer chosen (reasoning `.claude/skills/` vs implementation
      `.clinerules/skills/`); asked if unclear
- [ ] Source resolved: search pick, `owner/repo`, or direct link
- [ ] Security review run; verdict handled (SAFE proceed / WARNING confirm / DANGEROUS block)
- [ ] `npx skills` command run at **project scope** (never `-g`, never into the plugin)
- [ ] Folder name matches the skill `name`
- [ ] Destructive op (update/remove) confirmed with the user
- [ ] Project catalog synced for the touched layer (no plugin files edited); no dangling references

## Examples
### Add from a search
User: "Add a react skill." → `npx skills find react` (top row = most-installed match),
present matches via AskUserQuestion, confirm layer = implementation, security-review the
pick, then `npx skills add <owner/repo> --skill react -a cline` (project scope) → add the
row to the project's `.clinerules/skills/README.md` Implementation list.

### Add a reasoning skill from a direct link
User pastes `https://github.com/owner/repo/tree/main/skills/architecture-review` for
`.claude`. → Confirm layer = reasoning, security-review,
`npx skills add <link> -a claude` (installs into the **project's** `.claude/skills/`),
optionally add the Strix `metadata` marker to the installed `SKILL.md`. No plugin doc is
touched; Claude Code auto-discovers the new project skill by its plain name.

### Update
User: "Update the react skill." → Confirm, `npx skills update react`, re-review, re-apply the
optional Strix marker if it's a marked `.claude` skill, re-sync the project catalog only if
name/description changed.

### Remove
User: "Delete the sql skill." → **Ask** "Remove `sql` permanently?" If yes,
`npx skills remove sql` and strip it from the project catalog; if no, do nothing.

### Refuse a plugin-scope request
User: "Add this as a built-in Strix reasoning skill." → Explain that this skill is
project-scoped and installs into the project's `.claude/skills/`; changing Strix's built-in
plugin skills is Strix-plugin development in the plugin repo, not something to do here.

### Blocked by security review
A candidate's `scripts/setup.sh` pipes `curl … | sh` and reads `~/.aws/credentials`. →
Verdict DANGEROUS: refuse to install, report the findings, suggest an audited alternative.

## Related
[cline-skill-handler](../cline-skill-handler/SKILL.md) ·
[risk-analysis](../risk-analysis/SKILL.md) ·
[knowledge-update](../knowledge-update/SKILL.md)
