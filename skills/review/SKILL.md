---
name: review
description: Strix projects only (requires .strix/). Verify a task in Review against its Acceptance Criteria, conventions, and scope, re-running the checks its Execution Report lists, then approve or record a precise change list. Use for the reviewer-agent when a task enters Review; read the task's diff, never edit source.
metadata:
  kind: reasoning
  engine: claude
---

# Review

## Purpose
Verify a completed task against its Acceptance Criteria, conventions, and scope;
approve or return a precise change list. Check the work; don't take the
executor's report on trust.

## When to use
The Router selects this for `reviewer-agent` when a task enters Review.

## Inputs / Outputs
- **In:** the task in `.strix/tasks/review/<workstream>/` (find it with
  `.strix/bin/strix-task where <ID>`), its diff from
  `.strix/bin/strix-task diff <ID>`, conventions, architecture.
- **Out:** a verdict — Approve, Changes Requested (checklist), or Re-plan —
  recorded on the board and returned to the orchestrator.

## Procedure
1. Read the task's Acceptance Criteria, Out of Scope, and Execution Report. On a
   second or later round, read the newest Execution Report entry against the
   newest Review Checklist entry.
2. Run `.strix/bin/strix-task diff <ID>`: the commits carrying
   `Strix-Task: <ID>` since the task's Base. If it warns about uncommitted
   changes, that work is not part of the task: request that it be committed.
3. **Verify:** re-run the build/lint/test commands the Execution Report lists
   and compare the results with what it claims. Change nothing while doing so.
4. Walk the diff against each criterion; check conventions and architecture.
5. Run risk-analysis on the change.
6. Run `.strix/bin/strix-task doctor` to check the board.
7. Record the verdict (pass `--by reviewer-agent` so History names you):
   - **Approve:** `.strix/bin/strix-task move <ID> done`.
   - **Changes Requested:**
     `.strix/bin/strix-task note <ID> --section "Review Checklist" --text "..."`
     (one numbered, required change per line), then
     `.strix/bin/strix-task move <ID> active`.
   - **Re-plan** (the task itself is wrong):
     `.strix/bin/strix-task move <ID> queue --reason "..."`.

_Claude reads source and never edits it. Running `strix-task`, `git`, and the
reported checks is verification, not execution; fixing anything is the
executor's job._

## Rules
**Do**
- Review against the task, not personal taste.
- Flag anything outside Out of Scope as over-engineering.
- Give specific, actionable change items.
- Treat a check you could not reproduce as failing until explained.
- Confirm the board is healthy with `strix-task doctor`.

**Don't**
- Don't edit source — fixes are the executor's job.
- Don't approve when a re-run check fails, or when the work is not committed.
- Don't update knowledge — that is `knowledge-agent`.
- Don't use `--override` to push a task along.

## Checklist
- [ ] Read `strix-task diff <ID>`; no uncommitted work outside it
- [ ] Re-ran the Execution Report's checks; results match
- [ ] Every Acceptance Criterion verified
- [ ] Conventions + architecture respected
- [ ] No out-of-scope / over-engineered work
- [ ] `strix-task doctor` is clean
- [ ] Verdict recorded with `strix-task move` (and `note` for changes)

## Examples
### Over-engineering caught
Task asked for one endpoint; diff added a generic plugin system. Verdict:
Changes Requested — remove out-of-scope abstraction.

### Missing test
Acceptance Criteria require a regression test; none present. Verdict: Changes
Requested with the exact missing case.

## Related
[risk-analysis](../risk-analysis/SKILL.md) · [architecture](../architecture/SKILL.md)
