---
name: cline-skill-handler
description: Govern the lifecycle of Cline's implementation skills in .cline/skills/ — create, update, or delete a skill in the open Agent Skills (agentskills.io) format and keep every document that references it consistent. Use when a request asks to add, rewrite, modify, or remove a Cline implementation skill (e.g. "create a graphql skill", "rewrite the skill in .cline/skills/", "delete the docker skill"). Claude authors the definition; Cline executes it.
metadata:
  kind: reasoning
  engine: claude
---

# Cline Skill Handler

## Purpose
Govern the lifecycle of Cline's implementation skills in `.cline/skills/`:
create, update, or delete a skill on request, authored in the open
[Agent Skills format](https://agentskills.io/specification), while keeping every
document that points to it consistent. Claude authors the skill definition
(reasoning output); Cline loads and executes it.

## When to use
The Router selects this when a request asks to add, rewrite, modify, or remove a
Cline implementation skill — e.g. "create a `graphql` skill", "rewrite the skill
I dropped in `.cline/skills/`", "delete the `docker` skill".

## Agent Skills format (agentskills.io)

A skill is a directory containing, at minimum, a `SKILL.md` file: YAML
frontmatter followed by a Markdown body of instructions. Cline (like every
compatible agent) loads it via **progressive disclosure** — three tiers:

1. **Metadata** (~100 tokens) — `name` + `description`, read at startup to decide
   relevance.
2. **Instructions** (<5,000 tokens recommended) — the full `SKILL.md` body, loaded
   on activation.
3. **Resources** (as needed) — files in `references/`, `scripts/`, `assets/`,
   loaded only when the body points to them.

### Frontmatter fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars; lowercase `a-z`, `0-9`, hyphens; no leading/trailing hyphen; no consecutive `--`; **must match the parent directory name**. |
| `description` | Yes | Max 1024 chars, non-empty. Says what the skill does **and when** to use it. |
| `license` | No | License name or a bundled license file reference. |
| `compatibility` | No | Max 500 chars. Environment needs (product, packages, network). Most skills omit it. |
| `metadata` | No | Arbitrary string→string map. Use unique keys. |
| `allowed-tools` | No | Space-separated pre-approved tools (experimental; support varies). |

```yaml
---
name: skill-name
description: What the skill does and WHEN Cline should activate it.
---
```

### Writing the `description` (it drives triggering)
- Imperative — "Use when…", not "This skill does…".
- Focus on user intent; list contexts where it applies, incl. cases where the
  user doesn't name the domain.
- Concise but specific; keep it under the 1024-char limit.

### Directory layout
```
.cline/skills/<name>/
  SKILL.md          ← required; frontmatter + instructions (< 500 lines / 5 000 tokens)
  references/       ← optional; deeper docs, loaded on demand
  scripts/          ← optional; executable code (only output enters context, not source)
  assets/           ← optional; templates, schemas, data files
```
- Reference bundled files with **relative paths from the skill root**
  (`references/API.md`, `scripts/build.sh`); keep references one level deep.
- Tell the agent **when** to load each file ("Read `references/errors.md` if the
  build fails") rather than a generic "see references/".
- Keep the body lean: front-load core instructions; move overflow to `references/`.

## Inputs / Outputs
- **In:** user request, target skill name, existing `.cline/skills/*`, and the
  reference documents (see Reference documents below).
- **Out:** a created/updated/deleted skill under `.cline/skills/<name>/` plus
  synchronized references — or an explicit "no change" when the user declines.

## Reference documents to keep in sync
Any create (with rename), or delete of a Cline skill must be reflected in:

- `.cline/skills/README.md` — Implementation Skills catalog (Claude-side registry)
- `docs/skills.md` — "Implementation Skills (Cline)" table + skill count
- `docs/README.md` — skill count in the `skills.md` row
- `README.md` — repo-structure tree ("N implementation skills")
- `.claude/rules/routing.md` — "Typical skills" column, if the skill is routed
- `docs/router.md` — routing table, if the skill is routed

## Operations / Procedure
_No terminal commands — reasoning + file authoring only._

**Create**
1. Confirm the skill name (lowercase-hyphen, will match the folder) and scope.
2. If the user already hand-authored a skill under `.cline/skills/<name>/`,
   read it and **ask** whether to rewrite it for consistency before touching it.
3. Write `.cline/skills/<name>/SKILL.md` with valid frontmatter (`name` matching
   the dir, a trigger-accurate `description`).
4. Fill the body minimally: when-to-use, step-by-step instructions, key rules,
   examples. Move any content over ~500 lines / 5,000 tokens into `references/`
   and point to it on demand.
5. Validate the frontmatter/naming (e.g. `skills-ref validate .cline/skills/<name>`).
6. Add the skill to every reference document above.

**Update**
1. Identify the target skill and the exact change requested.
2. Flag any **critical change** (rename, capability removal, workflow-breaking)
   and **ask** the user to confirm before applying.
3. Apply the minimal edit to `SKILL.md` (and any `references/` files if relevant).
4. If the name changed, rename the folder to match `name` and propagate the
   rename to every reference document.

**Delete**
1. **Ask** the user to confirm they really want to delete the skill.
2. If **no** → do nothing and stop.
3. If **yes** → remove `.cline/skills/<name>/` and its entry from every
   reference document; verify no workflow or routing row still points to it.

## Rules
**Do**
- Author Cline skills as a single `SKILL.md` under `.cline/skills/<name>/`,
  following the [Agent Skills spec](https://agentskills.io/specification).
- Set `name` (lowercase-hyphen, matches the folder) and a specific, imperative
  `description` (≤1024 chars) that controls when Cline activates the skill.
- Keep `SKILL.md` under ~500 lines / 5,000 tokens; put deeper material in
  `references/` and reference it on demand (progressive disclosure).
- Use relative, one-level-deep paths for bundled `references/`, `scripts/`, `assets/`.
- Before rewriting a user-authored skill, review it and **ask** for confirmation.
- Confirm any **critical change** before applying: renaming a skill, removing a
  capability other tasks rely on, or anything that breaks an existing workflow.
- Before deleting, **ask** the user to confirm; only proceed on an explicit yes.
- After any create/rename/delete, update every reference document so counts,
  tables, and links stay accurate.
- Keep content minimal and accurate — match the terse style of sibling skills.

**Don't**
- Don't use `kind`/`engine` frontmatter in Cline skills — Cline reads `name` and
  `description` (plus the optional spec fields); it does not use Strix's
  reasoning-only metadata.
- Don't give a skill a `name` that mismatches its folder, uses uppercase, or has
  leading/trailing/consecutive hyphens.
- Don't write, run, build, lint, or test implementation code — this authors
  skill definitions only.
- Don't rewrite a hand-authored skill without asking first.
- Don't rename or delete a skill without confirming the critical change.
- Don't leave a dangling reference: a deleted/renamed skill must vanish from all
  docs and the routing table in the same change.
- Don't silently change a skill's scope; surface breaking changes to the user.

## Checklist
- [ ] Operation identified: create / update / delete
- [ ] Create: user-authored skill reviewed and rewrite confirmed before editing
- [ ] Create: `SKILL.md` written under `.cline/skills/<name>/`
- [ ] Frontmatter valid: `name` lowercase-hyphen matching folder + `description`
      (≤1024, says what + when)
- [ ] `SKILL.md` body under ~500 lines / 5,000 tokens; overflow moved to `references/`
- [ ] Bundled resources use relative, one-level-deep paths; load-on-demand noted
- [ ] Frontmatter/naming validated (e.g. `skills-ref validate`)
- [ ] Update: critical changes (rename, capability/workflow break) confirmed
- [ ] Delete: user explicitly confirmed before removal
- [ ] All reference documents synced (README, docs/skills.md, docs/README.md,
      .cline/skills/README.md, routing table)
- [ ] Skill counts accurate; no dangling references remain

## Examples
### Create a new skill
User: "Add a `graphql` skill for Cline." → Confirm scope, write
`.cline/skills/graphql/SKILL.md` with `name: graphql` and a specific, imperative
`description`, keep the body lean, then add `graphql` to `.cline/skills/README.md`,
`docs/skills.md`, and bump the counts in `docs/README.md` and `README.md`.

### Rewrite a hand-authored skill
User dropped a rough `.cline/skills/kafka/SKILL.md` and asks Claude to make it
consistent. → Read it first, **ask** "Rewrite to valid Agent Skills
`name`/`description` frontmatter and structure, keeping your scope?" Only rewrite
after a yes.

### Update with a critical change
User: "Rename `node` to `backend`." → Breaks references, so **confirm** first,
then rename the folder `.cline/skills/node/` → `.cline/skills/backend/` (so `name`
still matches the dir), update the `name` field, and propagate `node → backend`
across every reference document and any routing row.

### Split an oversized skill
A `testing` skill body exceeds 5,000 tokens. → Keep the core workflow in
`SKILL.md`; move framework-specific detail to `references/jest.md` and point to it
("Read `references/jest.md` when the project uses Jest").

### Delete
User: "Delete the `docker` skill." → **Ask** "Delete `docker` permanently?" If
yes, remove `.cline/skills/docker/` and strip it from all references; if no,
do nothing.

## Related
[knowledge-update](../knowledge-update/SKILL.md) · [documentation](../documentation/SKILL.md)
