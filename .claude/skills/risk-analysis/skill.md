---
name: risk-analysis
kind: reasoning
engine: claude
---

# Skill: Risk Analysis

## Purpose
Surface security, data, and blast-radius risks in a plan, task, or change, and
turn them into mitigations or Out-of-Scope boundaries.

## When To Use
Router selects this during planning, task creation, and review of higher-risk
work.

## Inputs / Outputs
- **In:** plan/task/diff, `coding-conventions.md` (security), architecture.
- **Out:** ranked risks with mitigations; items for Out of Scope / dependencies.

## Files
- `skill.md` · `examples.md` · `rules.md` · `commands.md` · `checklist.md`

## Related
[review](../review/skill.md) · [architecture](../architecture/skill.md) · [ADR](../ADR/skill.md)
