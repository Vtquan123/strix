---
agent: agent
description: Resolve a defect defined by a Strix bug task (fix workflow) — root-cause fix plus a regression test.
---
Task file: ${input:task:absolute or repo-relative path to the READY bug task, under .strix/tasks/active/<workstream>/}

Resolve the defect defined by the task above. Follow the always-on Strix executor
instructions in `.github/copilot-instructions.md`.

## Steps

<!-- strix:gen start id=shared.workflows.fix.steps -->
1. **Read** the task; note the reported symptom and Acceptance Criteria.
2. **Reproduce** the failure (test, script, or manual step per the task).
3. **Find the root cause** — fix the cause, not the symptom.
4. **Capture it**: add a failing test that would have caught the bug
   (use the `debugging` and `testing` skills).
5. **Fix minimally**: the smallest change that makes the test pass.
6. **Verify**: build, lint, and run the whole suite to check for regressions.
7. **Escalate** if the true fix requires an architecture or convention change.
   Run `.strix/bin/strix-task move <ID> queue --reason "<what needs deciding>" --by executor` and stop.
8. **Complete**: when the Definition of Done holds:
   - commit the work; every commit message ends with the trailer line
     `Strix-Task: <ID>`;
   - record the Execution Report with
     `.strix/bin/strix-task note <ID> --section "Execution Report" --text "..." --by executor`:
     each command run, its exit code, the tail of its output, and the commit SHAs;
   - run `.strix/bin/strix-task move <ID> review --by executor`. It refuses without the report,
     and it moves the task within its workstream and sets `Status: In Review`.
   If your current mode cannot run commands, print these exact commands and ask
   the human to run them.
<!-- strix:gen end id=shared.workflows.fix.steps -->

## Guardrails

<!-- strix:gen start id=shared.workflows.fix.guardrails -->
- No opportunistic refactors while fixing — file a separate task.
- The regression test is part of Definition of Done for a fix.
<!-- strix:gen end id=shared.workflows.fix.guardrails -->
