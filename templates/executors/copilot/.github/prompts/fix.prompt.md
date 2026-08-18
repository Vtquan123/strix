---
agent: agent
description: Resolve a defect defined by a Strix bug task (fix workflow) — root-cause fix plus a regression test.
---
Task file: ${input:task:absolute or repo-relative path to the READY bug task in .strix/tasks/active/}

Resolve the defect defined by the task above. Follow the always-on Strix executor
instructions in `.github/copilot-instructions.md`.

## Steps

1. **Read** the task; note the reported symptom and Acceptance Criteria.
2. **Reproduce** the failure (test, script, or manual step per the task).
3. **Find the root cause** — fix the cause, not the symptom.
4. **Capture it**: add a failing test that would have caught the bug.
5. **Fix minimally**: the smallest change that makes the test pass.
6. **Verify**: build, lint, and run the whole suite to check for regressions.
7. **Escalate** if the true fix requires an architecture or convention change.
8. **Complete**: move the task file from `.strix/tasks/active/` to
   `.strix/tasks/review/` and set `Status: In Review`, with the new test in
   place. If you cannot move files, print the exact `git mv` command for the
   human.

## Guardrails

- No opportunistic refactors while fixing — file a separate task.
- The regression test is part of the Definition of Done for a fix.
