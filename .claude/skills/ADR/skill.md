---
name: ADR
kind: reasoning
engine: claude
---

# Skill: ADR (Architecture Decision Record)

## Purpose
Capture significant, hard-to-reverse decisions — context, choice, options,
consequences — as immutable records in `knowledge/decisions/`.

## When To Use
Router selects this for architecture, convention, tech-stack, or business-rule
decisions with structural impact.

## Inputs / Outputs
- **In:** the decision, options considered, constraints.
- **Out:** a new numbered ADR (or a supersede of an old one).

## Files
- `skill.md` · `examples.md` · `rules.md` · `commands.md` · `checklist.md`

## Related
[architecture](../architecture/skill.md) · [knowledge-update](../knowledge-update/skill.md)
