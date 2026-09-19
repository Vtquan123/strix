---
agent: agent
description: Apply the reviewer's change checklist and return the task to Review (review-fixes workflow).
---
Task file: ${input:task:absolute or repo-relative path to the task, under .strix/tasks/active/<workstream>/, carrying a "## Review Checklist"}

`reviewer-agent` returned **Changes Requested** and moved the task Review →
Active with a `## Review Checklist` section. Apply it. Follow the always-on Strix
executor instructions in `.github/copilot-instructions.md`.

## Steps

<!-- strix:gen start id=shared.workflows.review-fixes.steps -->
1. **Read** the `## Review Checklist` section of the task. Act on the **newest**
   entry (earlier rounds are history). Each item is a discrete, required change.
2. **Address each item** exactly — do not add unrequested changes while in here.
3. **Verify** after each fix: build, lint, run tests.
4. **Escalate** any checklist item that would require an architecture,
   convention, or ADR change — those are Claude decisions, not the executor's.
   Run `.strix/bin/strix-task move <ID> queue --reason "<what needs deciding>" --by executor` and stop.
5. **Complete**: when the Definition of Done holds:
   - commit the work; every commit message ends with the trailer line
     `Strix-Task: <ID>`;
   - record a **new** Execution Report entry for this round with
     `.strix/bin/strix-task note <ID> --section "Execution Report" --text "..." --by executor`:
     each command run, its exit code, the tail of its output, and the commit SHAs;
   - run `.strix/bin/strix-task move <ID> review --by executor`. It refuses without the report,
     and it moves the task within its workstream and sets `Status: In Review`.
   If your current mode cannot run commands, print these exact commands and ask
   the human to run them.
<!-- strix:gen end id=shared.workflows.review-fixes.steps -->

## Guardrails

<!-- strix:gen start id=shared.workflows.review-fixes.guardrails -->
- Scope is the checklist, nothing more. New scope needs a new task.
- Repeatedly bouncing on the same item signals a task/design problem — escalate
  rather than guess.
<!-- strix:gen end id=shared.workflows.review-fixes.guardrails -->
