---
agent: agent
description: Implement a READY Strix task (implement workflow) — build a new feature/capability within its scope.
---
Task file: ${input:task:absolute or repo-relative path to the READY task, under .strix/tasks/active/<workstream>/}

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
   satisfied, run `.strix/bin/strix-task move <ID> review`. It moves the task within its
   workstream and sets `Status: In Review` for you. If you cannot move files, print the exact `.strix/bin/strix-task` command for the human.

## Guardrails

- `Out of Scope` is binding. Over-engineering fails review.
- Design decisions escalate to Claude; they are never made here.
