---
name: cline-skill-handler
kind: reasoning
engine: claude
---

# Skill: Cline Skill Handler

## Purpose
Govern the lifecycle of Cline's implementation skills in `.agents/skills/`:
create, update, or delete a skill on request while keeping every document that
points to it consistent. Claude authors the skill definition (reasoning output);
Cline still only reads it.

## When To Use
Router selects this when a request asks to add, rewrite, modify, or remove a
Cline implementation skill — e.g. "create a `graphql` skill", "rewrite the skill
I dropped in `.agents/skills/`", "delete the `docker` skill".

## Operations
- **Create** — scaffold a brand-new skill (five-file contract). If the user
  already hand-authored one under `.agents/skills/` and wants it made
  consistent, review it and ask before rewriting.
- **Update** — apply the requested change; confirm critical/breaking changes;
  propagate to all documents that reference the skill.
- **Delete** — confirm intent first; on yes, remove the skill and fix every
  reference so no workflow points at a missing skill; on no, do nothing.

## Inputs / Outputs
- **In:** user request, target skill name, existing `.agents/skills/*`, and the
  reference documents (see `commands.md`).
- **Out:** a created/updated/deleted skill under `.agents/skills/<name>/` plus
  synchronized references — or an explicit "no change" when the user declines.

## Files
- `skill.md` · `examples.md` · `rules.md` · `commands.md` · `checklist.md`

## Related
[knowledge-update](../knowledge-update/skill.md) · [documentation](../documentation/skill.md)
