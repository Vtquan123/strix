---
name: task-breakdown
description: Strix projects only (requires .strix/). Decompose an EPIC into STANDARD tasks with explicit dependencies and per-task scope estimates — the gate that keeps EPICs from ever reaching the executor whole. Use whenever the Router classifies complexity as EPIC.
metadata:
  kind: reasoning
  engine: claude
---

# Task Breakdown

## Purpose
Decompose an EPIC into STANDARD tasks with explicit dependencies and per-task
scope estimates. The gate that keeps EPICs from ever reaching the executor whole.

## When to use
The Router selects this whenever complexity is EPIC.

## Inputs / Outputs
- **In:** EPIC intent, plan, architecture.
- **Out:** a registered workstream holding a set of linked STANDARD tasks +
  dependency graph + scope estimates.

## Procedure
1. Restate the EPIC goal and boundaries.
2. Register the EPIC as a workstream (skip this when the skill is only used to
   gauge size, e.g. by read-only `triage-agent`) —
   `.strix/bin/strix-task workstream add <id> --prefix <P> --owner <who>`.
   **An EPIC is a workstream**: its tasks live together under `<stage>/<id>/`,
   which is what lets it run in parallel with someone else's EPIC on one board.
3. Identify natural seams (modules, layers, features).
4. Cut one STANDARD task per seam, inside that workstream.
5. Draw the dependency graph.
6. Estimate scope per task, and return the breakdown to the orchestrator (or,
   inside `task-creator-agent`, author the tasks from it).

_The only terminal command here is `strix-task`, to register the workstream.
Decomposition itself is reasoning._

## Rules
**Do**
- Ensure each output task is STANDARD or smaller.
- Make dependencies explicit and acyclic.
- Give every task a scope estimate (files).
- Keep tasks independently reviewable.
- Give the workstream a short, distinct prefix; `strix-task` rejects one that
  another workstream already uses.

**Don't**
- Don't emit a task that still smells like an EPIC.
- Don't create hidden coupling between tasks.
- Don't pad with tasks outside the EPIC's goal.

## Checklist
- [ ] EPIC goal + boundaries restated
- [ ] Workstream registered, with a unique prefix
- [ ] Each task STANDARD or smaller
- [ ] Dependencies explicit + acyclic
- [ ] Scope estimated per task
- [ ] Tasks independently reviewable
- [ ] No task outside the EPIC goal

## Examples
### EPIC: billing
Registered as workstream `billing-system` (prefix `BILL`), then split into:
schema, payment-provider adapter, checkout endpoint, invoice UI, webhooks. Each
STANDARD; webhooks depend on the adapter. All five land in
`queue/billing-system/` as `BILL-001`…`BILL-005`.

### Dependency graph
Draw edges so independent tasks (schema, UI shell) can run in parallel while
dependent ones wait.

## Related
[planning](../planning/SKILL.md) · [architecture](../architecture/SKILL.md) · [risk-analysis](../risk-analysis/SKILL.md)
