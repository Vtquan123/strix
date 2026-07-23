---
name: planning
kind: reasoning
engine: claude
---

# Skill: Planning

## Purpose
Turn a clarified requirement into an ordered, dependency-aware plan of STANDARD
tasks that Cline can execute one at a time.

## When To Use
Router selects this for SIMPLE+ features and as the backbone step before
`task-breakdown` on EPICs.

## Inputs / Outputs
- **In:** triaged intent, `project-context.md`, `architecture.md`.
- **Out:** an ordered task plan with dependencies and scope estimates.

## Files
- `skill.md` — overview · `examples.md` — worked plans · `rules.md` — do/don't
- `commands.md` — reasoning procedure · `checklist.md` — pre/post checks

## Related
[task-breakdown](../task-breakdown/skill.md) · [architecture](../architecture/skill.md) · [risk-analysis](../risk-analysis/skill.md)
