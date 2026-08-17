---
name: planning
description: Turn a clarified requirement into an ordered, dependency-aware plan of STANDARD tasks that the executor can execute one at a time. Use when the Router routes SIMPLE+ features, and as the backbone step before task-breakdown on EPICs.
metadata:
  kind: reasoning
  engine: claude
---

# Planning

## Purpose
Turn a clarified requirement into an ordered, dependency-aware plan of STANDARD
tasks that the executor can execute one at a time.

## When to use
The Router selects this for SIMPLE+ features and as the backbone step before
`task-breakdown` on EPICs.

## Inputs / Outputs
- **In:** triaged intent, `project-context.md`, `architecture.md`.
- **Out:** an ordered task plan with dependencies and scope estimates.

## Procedure
1. Restate the goal in one sentence.
2. List the capabilities the goal needs (feature/data/UI/infra).
3. Map capabilities to candidate STANDARD tasks.
4. Order tasks; draw the dependency edges.
5. Estimate scope (files touched) per task.
6. Hand the plan to `task-creator-agent`.

_No terminal commands — planning is reasoning only._

## Rules
**Do**
- Produce the smallest plan that satisfies the requirement.
- Make every dependency explicit.
- Size each task to STANDARD or smaller.
- Note assumptions; flag unknowns for `risk-analysis`.

**Don't**
- Don't plan implementation details — that is the executor's job.
- Don't emit an EPIC as one step.
- Don't add "nice to have" tasks outside the requirement (over-engineering).

## Checklist
- [ ] Goal restated in one sentence
- [ ] Every task is STANDARD or smaller
- [ ] Dependencies explicit and acyclic
- [ ] Scope estimated per task
- [ ] No out-of-requirement tasks added
- [ ] Unknowns flagged for risk-analysis

## Examples
### Feature: user avatars
Plan:
1. TASK-A add avatar column + migration (dep: none)
2. TASK-B upload endpoint (dep: A)
3. TASK-C UI upload control (dep: B)
Each is STANDARD; C blocked until B is Done.

### Ordering rule
When two tasks touch the same module, sequence them to avoid merge conflict and
make the dependency explicit rather than implicit.

## Related
[task-breakdown](../task-breakdown/SKILL.md) · [architecture](../architecture/SKILL.md) · [risk-analysis](../risk-analysis/SKILL.md)
