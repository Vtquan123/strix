---
name: review
description: Verify a completed task against its Acceptance Criteria, conventions, and scope, then approve or return a precise change list. Use for the reviewer-agent when a task enters Review; read the diff, never edit source.
metadata:
  kind: reasoning
  engine: claude
---

# Review

## Purpose
Verify a completed task against its Acceptance Criteria, conventions, and scope;
approve or return a precise change list.

## When to use
The Router selects this for `reviewer-agent` when a task enters Review.

## Inputs / Outputs
- **In:** task in `.strix/tasks/review/`, the diff, conventions, architecture.
- **Out:** verdict — Approve or Changes Requested (checklist).

## Procedure
1. Read the task's Acceptance Criteria and Out of Scope.
2. Walk the diff against each criterion.
3. Check convention + architecture adherence.
4. Run risk-analysis on the change.
5. Emit Approve or a numbered Changes-Requested checklist.

_No terminal commands — Claude reads, never executes._

## Rules
**Do**
- Review against the task, not personal taste.
- Flag anything outside Out of Scope as over-engineering.
- Give specific, actionable change items.
- Confirm Status field matches the task directory.

**Don't**
- Don't edit source — fixes are Cline's job.
- Don't approve with failing build/lint/tests.
- Don't update knowledge — that is `knowledge-agent`.

## Checklist
- [ ] Every Acceptance Criterion verified
- [ ] Conventions + architecture respected
- [ ] No out-of-scope / over-engineered work
- [ ] Build/lint/tests reported green by Cline
- [ ] Status field matches directory
- [ ] Verdict is specific and actionable

## Examples
### Over-engineering caught
Task asked for one endpoint; diff added a generic plugin system. Verdict:
Changes Requested — remove out-of-scope abstraction.

### Missing test
Acceptance Criteria require a regression test; none present. Verdict: Changes
Requested with the exact missing case.

## Related
[risk-analysis](../risk-analysis/SKILL.md) · [architecture](../architecture/SKILL.md)
