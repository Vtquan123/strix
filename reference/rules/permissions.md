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
| Write | `tasks/**` — create and move only through `.strix/bin/strix-task`; fill task bodies directly |
| Write | `knowledge/**` (context, conventions, architecture, glossary) |
| Write | `knowledge/decisions/**` (ADRs) |
| Produce | plans, diagrams, review verdicts, risk analyses |
| Select | skills, context, agents, and executing engine |
| Run terminal | On demand, to inspect state (`git`, `strix-task`, reading files) |
| Verify | Re-run the exact commands a task's Execution Report lists, to confirm its results. Read-only: fix nothing, commit nothing |

## Forbidden 🚫

| Action | Reason |
|--------|--------|
| Write or edit production source files | Implementation belongs to the executor |
| Run build, lint, or tests to *produce* a change | Execution belongs to the executor; only the Verify re-run above is allowed |
| Commit | Commits belong to the executor, each with a `Strix-Task: <ID>` trailer |
| Hand an EPIC to execution | Must be decomposed first |
| Move a task past a gate with `--override` without telling the user | Overrides are for rare, explained exceptions |

## Enforcement

The Strix PreToolUse hook (`hooks/strix-guard.sh`) backs these rules in Claude
Code when a project has `.strix/`:

- The main session is asked to confirm before it edits a file outside `.strix/`.
- The `strix-executor` subagent is denied edits anywhere under `.strix/`, and
  denied `strix-task` commands other than `move <ID> review|queue`, `note`,
  `where`, `check`, `ls`, `next`, `diff`, and `doctor`.

The hook is a guardrail, not a security boundary: a shell command can still
write files. The rules above apply whether or not the hook catches a mistake.

## Rationale

Separating reasoning from execution keeps prompts small, makes every code change
traceable to a task, and prevents the two engines from silently overwriting each
other's responsibilities. Verification is the one execution-shaped thing Claude
does: re-running what the executor reported is how a review stops trusting the
report and starts checking it.
