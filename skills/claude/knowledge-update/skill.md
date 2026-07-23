---
name: knowledge-update
kind: reasoning
engine: claude
---

# Skill: Knowledge Update

## Purpose
Apply the knowledge governance policy: update `knowledge/*` only when a real
trigger fires, keeping the source of truth coherent and drift-free.

## When To Use
Router selects this for `knowledge-agent` after a task is approved.

## Inputs / Outputs
- **In:** approved task, reviewer verdict, current `knowledge/*`.
- **Out:** minimal, accurate knowledge/ADR updates — or an explicit "no update".

## Files
- `skill.md` · `examples.md` · `rules.md` · `commands.md` · `checklist.md`

## Related
[documentation](../documentation/skill.md) · [ADR](../ADR/skill.md) · [architecture](../architecture/skill.md)
