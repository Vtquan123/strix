---
name: task-breakdown
description: Decompose an EPIC into STANDARD tasks with explicit dependencies and per-task scope estimates — the gate that keeps EPICs from ever reaching the executor whole. Use whenever the Router classifies complexity as EPIC.
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
- **Out:** a set of linked STANDARD tasks + dependency graph + scope estimates.

## Procedure
1. Restate the EPIC goal and boundaries.
2. Identify natural seams (modules, layers, features).
3. Cut one STANDARD task per seam.
4. Draw the dependency graph.
5. Estimate scope per task; hand to `task-creator-agent`.

_No terminal commands — reasoning only._

## Rules
**Do**
- Ensure each output task is STANDARD or smaller.
- Make dependencies explicit and acyclic.
- Give every task a scope estimate (files).
- Keep tasks independently reviewable.

**Don't**
- Don't emit a task that still smells like an EPIC.
- Don't create hidden coupling between tasks.
- Don't pad with tasks outside the EPIC's goal.

## Checklist
- [ ] EPIC goal + boundaries restated
- [ ] Each task STANDARD or smaller
- [ ] Dependencies explicit + acyclic
- [ ] Scope estimated per task
- [ ] Tasks independently reviewable
- [ ] No task outside the EPIC goal

## Examples
### EPIC: billing
Split into: schema, payment-provider adapter, checkout endpoint, invoice UI,
webhooks. Each STANDARD; webhooks depend on the adapter.

### Dependency graph
Draw edges so independent tasks (schema, UI shell) can run in parallel while
dependent ones wait.

## Related
[planning](../planning/SKILL.md) · [architecture](../architecture/SKILL.md) · [risk-analysis](../risk-analysis/SKILL.md)
