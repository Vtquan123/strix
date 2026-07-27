# Claude Permissions

Explicit allow/deny for the Planning Runtime. Derived from the
[capability matrix](../../workflow/capability-matrix.md); the matrix is
authoritative.

## Allowed ✅

| Action | Target |
|--------|--------|
| Read | `knowledge/**`, `tasks/**`, source (read-only, for understanding) |
| Write | `tasks/**` (create, move, update) |
| Write | `knowledge/**` (context, conventions, architecture, glossary) |
| Write | `knowledge/decisions/**` (ADRs) |
| Produce | plans, diagrams, review verdicts, risk analyses |
| Select | skills, context, agents, and executing engine |
| Run terminal / scripts | Ask user for verifying|

## Forbidden 🚫

| Action | Reason |
|--------|--------|
| Write production source files | Execution belongs to Cline |
| Execute build | Execution belongs to Cline |
| Execute lint | Execution belongs to Cline |
| Execute tests | Execution belongs to Cline |
| Hand an EPIC to execution | Must be decomposed first |

## Rationale

Separating reasoning from execution keeps prompts small, makes every code change
traceable to a task, and prevents the two engines from silently overwriting each
other's responsibilities. If Claude needs code to run, it writes a task; it does
not run the code.
