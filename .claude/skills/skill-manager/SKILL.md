---
name: skill-manager
description: Install, update, or remove skills from the skills.sh registry (Vercel Labs `npx skills`) into either .claude/skills/ (reasoning) or .clinerules/skills/ (implementation). Use when a request asks to add or find a skill from skills.sh, install a skill by owner/repo or a direct link, or update/delete a skills.sh-installed skill — e.g. "add a react skill", "install owner/repo --skill x", "update the react skill", "remove the sql skill". Searches the registry, reviews the skill for safety, installs into the chosen layer, patches reasoning-skill metadata when needed, then syncs the registry docs.
metadata:
  kind: reasoning
  engine: claude
---

# Skill Manager

## Purpose
Manage the lifecycle of skills sourced from the open-source
[skills.sh](https://www.skills.sh) registry (the Vercel Labs `npx skills` CLI),
installing them into Strix's two skill layers — `.claude/skills/` (reasoning) and
`.clinerules/skills/` (implementation) — and keeping every document that references them
consistent. skills.sh skills already use the open
[Agent Skills format](https://agentskills.io/specification) (one `SKILL.md`,
`name` + `description` frontmatter), so they drop in with minimal conversion.

This skill **runs `npx skills` on demand** — a terminal capability shared with Cline per
[runtime-separation.md](../../../workflow/runtime-separation.md) and
[permissions.md](../../rules/permissions.md) ("Run terminal / scripts — ask user for
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
  layer; existing `.claude/skills/*` and `.clinerules/skills/*`; the registry docs (below).
- **Out:** a skill installed/updated/removed under the chosen layer, reasoning-metadata
  patched when needed, and the registry docs synced — or an explicit "no change" when the
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
- **Agent flag** picks the target directory: `-a claude` → `.claude/skills/`,
  `-a cline` → `.clinerules/skills/`.
- Use **project scope** (default; committed). Do not use `-g` (global) unless the user
  explicitly asks for a machine-wide install.

## Choosing the target layer
- **Reasoning** (`-a claude` → `.claude/skills/`) — how-to-**think** skills: planning,
  review, architecture, domain reasoning. **Requires a metadata patch after install** (see
  Procedure step 5).
- **Implementation** (`-a cline` → `.clinerules/skills/`) — how-to-**build** skills: code,
  test, ship. No patch — skills.sh format already matches Cline's.
- If the request doesn't make the layer obvious, **ask the user** before installing.

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
4. `npx skills add <owner/repo> --skill <name> -a <claude|cline>`.
5. **If `-a claude`:** patch the installed `SKILL.md` frontmatter to add Strix's
   reasoning-skill block so it conforms:
   ```yaml
   metadata:
     kind: reasoning
     engine: claude
   ```
   (Skills.sh ships only `name`+`description`; Cline installs need no patch.)
6. Sync the registry docs for the chosen layer (below).

**Add (from a direct link)** — user pastes `owner/repo`, a GitHub URL, or a deep link
1. Skip search. Confirm the target layer.
2. Security review → `npx skills add <link> -a <agent>` → patch metadata if `-a claude` →
   sync docs.

**Update** — "update the react skill"
1. Confirm the target skill. `npx skills update <name>` (or `npx skills update` for all).
2. Re-run the security review on the updated content.
3. If it's a `.claude` skill, **re-apply the reasoning-metadata patch** (an update may
   overwrite the frontmatter).
4. Re-sync docs only if `name`/`description` changed.

**Remove** — "delete the react skill"
1. **Ask the user to confirm** the deletion. If no → stop.
2. `npx skills remove <name>` (from whichever layer it lives in).
3. Strip the skill from every registry doc; verify no dangling routing row remains.

**List** — `npx skills ls`; cross-check against `docs/skills.md` (both tables) and flag any
skill that is installed but unregistered, or registered but missing.

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

## Docs to keep in sync
An add / rename / remove must update the registry docs **for the layer it touched**:

- [.clinerules/skills/README.md](../../../.clinerules/skills/README.md) — the Reasoning **and**
  Implementation skill lists (Claude-side registry)
- [docs/skills.md](../../../docs/skills.md) — the **Reasoning Skills** table (if `-a claude`)
  or the **Implementation Skills** table (if `-a cline`), plus any count
- [docs/README.md](../../../docs/README.md) — the skill count in the `skills.md` row, if a
  count is shown
- [README.md](../../../README.md) — the repo-tree skill counts (reasoning and/or
  implementation)
- [.claude/rules/routing.md](../../rules/routing.md) +
  [docs/router.md](../../../docs/router.md) — only if the installed skill is Router-routed

## Rules
**Do**
- Default to **project scope** and pick the layer per request; ask when the layer is
  ambiguous.
- Run the **security review** before every install and update; block DANGEROUS skills.
- After a `-a claude` install/update, **patch in** `metadata.kind: reasoning` /
  `engine: claude` so the skill conforms to the reasoning-skill contract.
- Keep the installed skill's folder name matching its `name` frontmatter.
- Confirm before any `update` or `remove` (destructive), and before installing a
  WARNING-level skill.
- After any add/rename/remove, update every registry doc so counts, tables, and links stay
  accurate — no dangling references.

**Don't**
- Don't install a skill that failed the security review; never override a DANGEROUS verdict.
- Don't add `metadata.kind`/`engine` to a **Cline** (`.clinerules/skills/`) install — Cline reads
  only `name`+`description`.
- Don't use `-g`/global unless the user explicitly asks.
- Don't remove or update a skill without confirming first.
- Don't author skill content here — that's [cline-skill-handler](../cline-skill-handler/SKILL.md);
  this skill pulls ready-made skills from the registry.

## Checklist
- [ ] Operation identified: add / update / remove / list
- [ ] Target layer chosen (reasoning `.claude` vs implementation `.clinerules`); asked if unclear
- [ ] Source resolved: search pick, `owner/repo`, or direct link
- [ ] Security review run; verdict handled (SAFE proceed / WARNING confirm / DANGEROUS block)
- [ ] `npx skills` command run at project scope
- [ ] `-a claude` installs patched with `metadata.kind: reasoning` / `engine: claude`
- [ ] Folder name matches the skill `name`
- [ ] Destructive op (update/remove) confirmed with the user
- [ ] Registry docs synced for the touched layer; counts accurate; no dangling references

## Examples
### Add from a search
User: "Add a react skill." → `npx skills find react` (top row = most-installed match),
present matches via AskUserQuestion, confirm layer = implementation, security-review the
pick, then
`npx skills add <owner/repo> --skill react -a cline` → add the row to the Implementation
table in `docs/skills.md` and `.clinerules/skills/README.md`, bump counts.

### Add a reasoning skill from a direct link
User pastes `https://github.com/owner/repo/tree/main/skills/architecture-review` for
`.claude`. → Confirm layer = reasoning, security-review, `npx skills add <link> -a claude`,
**patch** `metadata.kind: reasoning`/`engine: claude` into the installed `SKILL.md`, then
add it to the Reasoning table + registry lists.

### Update
User: "Update the react skill." → Confirm, `npx skills update react`, re-review, re-apply the
metadata patch if it's a `.claude` skill, re-sync docs only if name/description changed.

### Remove
User: "Delete the sql skill." → **Ask** "Remove `sql` permanently?" If yes,
`npx skills remove sql` and strip it from every registry doc; if no, do nothing.

### Blocked by security review
A candidate's `scripts/setup.sh` pipes `curl … | sh` and reads `~/.aws/credentials`. →
Verdict DANGEROUS: refuse to install, report the findings, suggest an audited alternative.

## Related
[cline-skill-handler](../cline-skill-handler/SKILL.md) ·
[risk-analysis](../risk-analysis/SKILL.md) ·
[knowledge-update](../knowledge-update/SKILL.md)
