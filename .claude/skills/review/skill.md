---
name: review
kind: reasoning
engine: claude
---

# Skill: Review

## Purpose
Verify a completed task against its Acceptance Criteria, conventions, and scope;
approve or return a precise change list.

## When To Use
Router selects this for `reviewer-agent` when a task enters Review.

## Inputs / Outputs
- **In:** task in `tasks/review/`, the diff, conventions, architecture.
- **Out:** verdict — Approve or Changes Requested (checklist).

## Files
- `skill.md` · `examples.md` · `rules.md` · `commands.md` · `checklist.md`

## Related
[risk-analysis](../risk-analysis/skill.md) · [architecture](../architecture/skill.md)
