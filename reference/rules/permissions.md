# Claude Permissions

Explicit allow/deny for the Planning Runtime. Hand-written operational rules,
kept consistent with the [capability matrix](../workflow/capability-matrix.md) —
the matrix stays authoritative on *who owns which capability*, while the rows
below add path and task scoping the matrix does not model. If the two ever
disagree, the matrix wins and this file is the bug.

## Allowed ✅

| Action | Target |
|--------|--------|
| Read | `knowledge/**`, `tasks/**`, source (read-only, for understanding) |
| Write | `tasks/**` (create, move, update) |
| Write | `knowledge/**` (context, conventions, architecture, glossary) |
| Write | `knowledge/decisions/**` (ADRs) |
| Produce | plans, diagrams, review verdicts, risk analyses |
| Select | skills, context, agents, and executing engine |
| Run terminal / scripts | On demand (inspect state, verify) — shared with the executor |

## Forbidden 🚫

| Action | Reason |
|--------|--------|
| Write production source files | Execution belongs to the executor |
| Execute build | Execution belongs to the executor |
| Execute lint | Execution belongs to the executor |
| Execute tests | Execution belongs to the executor |
| Hand an EPIC to execution | Must be decomposed first |

## Rationale

Separating reasoning from execution keeps prompts small, makes every code change
traceable to a task, and prevents the two engines from silently overwriting each
other's responsibilities. Claude may run the terminal on demand to inspect state
or verify. Producing the change is still the executor's: if code must be written or
build/lint/tests run, Claude writes a task rather than performing that execution.
