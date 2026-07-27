---
name: cline-skill-handler
kind: reasoning
engine: claude
---

# Skill: Cline Skill Handler

## Purpose
Govern the lifecycle of Cline's implementation skills in `.cline/skills/`:
create, update, or delete a skill on request while keeping every document that
points to it consistent. Claude authors the skill definition (reasoning output);
Cline loads and executes it.

## When To Use
Router selects this when a request asks to add, rewrite, modify, or remove a
Cline implementation skill — e.g. "create a `graphql` skill", "rewrite the skill
I dropped in `.cline/skills/`", "delete the `docker` skill".

## Cline Skill Format (per docs.cline.bot/customization/skills)

Each skill lives at `.cline/skills/<name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: One sentence describing WHEN Cline should activate this skill.
---
```

The `description` field drives progressive loading — Cline reads it (~100 tokens)
to decide whether to load the full instructions. Make it specific and trigger-accurate.

Optional subdirectories (loaded on demand, not inline):
- `docs/` — deeper reference, referenced via `read_file` inside SKILL.md
- `templates/` — reusable templates
- `scripts/` — executable scripts (only output enters context, not source)

Keep `SKILL.md` under 5,000 tokens. Front-load the most important instructions.

## Operations
- **Create** — scaffold `.cline/skills/<name>/SKILL.md` with correct frontmatter.
  If the user already hand-authored a skill, review it and ask before rewriting.
- **Update** — apply the requested change; confirm critical/breaking changes;
  propagate to all documents that reference the skill.
- **Delete** — confirm intent first; on yes, remove the skill and fix every
  reference so no workflow points at a missing skill; on no, do nothing.

## Inputs / Outputs
- **In:** user request, target skill name, existing `.cline/skills/*`, and the
  reference documents (see `commands.md`).
- **Out:** a created/updated/deleted skill under `.cline/skills/<name>/` plus
  synchronized references — or an explicit "no change" when the user declines.

## Files
- `skill.md` · `examples.md` · `rules.md` · `commands.md` · `checklist.md`

## Related
[knowledge-update](../knowledge-update/skill.md) · [documentation](../documentation/skill.md)
