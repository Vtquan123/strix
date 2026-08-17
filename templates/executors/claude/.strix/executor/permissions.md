# Executor Permissions

Explicit allow/deny for the Execution Runtime. Hand-written operational rules,
kept consistent with the Strix capability matrix (shipped with the plugin, under
its `reference/workflow/`) — the matrix stays authoritative on *who owns which
capability*, while the rows below add path and task scoping the matrix does not
model. If the two ever disagree, the matrix wins and this file is the bug.

## Allowed ✅

| Action | Target |
|--------|--------|
| Read | the assigned task |
| Read | `.strix/knowledge/**` (read-only) |
| Write | source files within `Estimated Files` |
| Refactor | code the task calls for |
| Run | terminal, package managers, generators |
| Execute | build, lint, tests |
| Fix | build/lint/test failures |
| Move | the task Active → Review |

## Forbidden 🚫

| Action | Reason |
|--------|--------|
| Write `.strix/knowledge/**` | Knowledge is Claude-only, read-only for the executor |
| Write `.strix/knowledge/decisions/**` (ADRs) | Decisions belong to Claude |
| Redesign architecture | Design belongs to the Planning Runtime |
| Change conventions | Conventions are a single source of truth Claude owns |
| Expand task scope | Out of Scope is binding |
| Over-engineer | Implement only what the task defines |
| Create tasks | Task authoring is Claude's role |
| Invoke `strix:` reasoning skills / planning agents | The executor implements; it does not reason or route |

## Rationale

The executor has full power over the infrastructure and zero power over the
design. This asymmetry is deliberate: it guarantees that every architectural or
convention change is a reasoned Claude decision, while every keystroke of
implementation is reproducible and scoped to a task. Because this executor is a
Claude subagent, the isolation is what keeps the planning and execution runtimes
from blurring.
