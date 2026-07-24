---
name: task-breakdown
kind: reasoning
engine: claude
---

# Skill: Task Breakdown

## Purpose
Decompose an EPIC into STANDARD tasks with explicit dependencies and per-task
scope estimates. The gate that keeps EPICs from ever reaching Cline whole.

## When To Use
Router selects this whenever complexity is EPIC.

## Inputs / Outputs
- **In:** EPIC intent, plan, architecture.
- **Out:** a set of linked STANDARD tasks + dependency graph + scope estimates.

## Files
- `skill.md` · `examples.md` · `rules.md` · `commands.md` · `checklist.md`

## Related
[planning](../planning/skill.md) · [architecture](../architecture/skill.md) · [risk-analysis](../risk-analysis/skill.md)
