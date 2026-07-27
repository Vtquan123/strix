# Reasoning Procedure: Cline Skill Handler

_No terminal commands — reasoning + file authoring only._

## Cline skill file contract

A skill is one file: `.cline/skills/<name>/SKILL.md`

```
.cline/skills/<name>/
  SKILL.md          ← required; frontmatter + instructions (< 5 000 tokens)
  docs/             ← optional; referenced via read_file inside SKILL.md
  templates/        ← optional
  scripts/          ← optional; only output enters context, not source
```

Required frontmatter fields:
```yaml
---
name: <kebab-case-name>
description: <one sentence — what triggers Cline to load this skill>
---
```

## Reference documents to keep in sync

Any create (with rename), or delete of a Cline skill must be reflected in:

- `.cline/skills/README.md` — Implementation Skills catalog (Claude-side registry)
- `docs/skills.md` — "Implementation Skills (Cline)" table + skill count
- `docs/README.md` — skill count in the `skills.md` row
- `README.md` — repo-structure tree ("N implementation skills")
- `.claude/rules/routing.md` — "Typical skills" column, if the skill is routed
- `docs/router.md` — routing table, if the skill is routed

## Create

1. Confirm the skill name (kebab-case) and its intended scope.
2. If the user already hand-authored a skill under `.cline/skills/<name>/`,
   read it and **ask** whether to rewrite it for consistency before touching it.
3. Write `.cline/skills/<name>/SKILL.md` with `name` + `description` frontmatter.
4. Fill the body minimally: when-to-use, step-by-step instructions, key rules,
   and `read_file` pointers to `docs/` if content would exceed 5,000 tokens.
5. Add the skill to every reference document above.

## Update

1. Identify the target skill and the exact change requested.
2. Flag any **critical change** (rename, capability removal, workflow-breaking)
   and **ask** the user to confirm before applying.
3. Apply the minimal edit to `SKILL.md` (and any `docs/` files if relevant).
4. If the name changed, propagate the rename to every reference document.

## Delete

1. **Ask** the user to confirm they really want to delete the skill.
2. If **no** → do nothing and stop.
3. If **yes** → remove `.cline/skills/<name>/` and its entry from every
   reference document; verify no workflow or routing row still points to it.
