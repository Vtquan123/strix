---
mode: agent
description: Implement a READY Strix task (implement workflow) — build a new feature/capability within its scope.
---
Task file: ${input:task:absolute or repo-relative path to the READY task in .strix/tasks/active/}

Build the new feature or capability defined by the STANDARD (or SIMPLE) task
above. Follow the always-on Strix executor instructions in
`.github/copilot-instructions.md`.

## Steps

1. **Read** the task; load its `Suggested Skills` and only the knowledge it
   references.
2. **Verify** the Definition of Ready and that dependencies are Done. If not,
   stop and report — do not implement.
3. **Implement** the Requirements within `Estimated Files`. No extra scope.
4. **Build** and resolve compile errors.
5. **Lint** and fix style to match `.strix/knowledge/coding-conventions.md`.
6. **Test**: add/extend tests to cover the Acceptance Criteria; run the suite.
7. **Check** every Acceptance Criterion. Iterate on implementation bugs.
8. **Complete**: on green build/lint/tests + criteria met + Definition of Done
   satisfied, move the task file from `.strix/tasks/active/` to
   `.strix/tasks/review/` and set `Status: In Review`. If you cannot move files
   in the current mode, print the exact `git mv` command and ask the human to run
   it.

## Guardrails

- `Out of Scope` is binding. Over-engineering fails review.
- Design decisions escalate to Claude; they are never made here.
