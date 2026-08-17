---
mode: agent
description: Apply the reviewer's change checklist and return the task to Review (review-fixes workflow).
---
Task file: ${input:task:absolute or repo-relative path to the task in .strix/tasks/active/ carrying a "## Review Checklist"}

`reviewer-agent` returned **Changes Requested** and moved the task Review →
Active with a `## Review Checklist` section. Apply it. Follow the always-on Strix
executor instructions in `.github/copilot-instructions.md`.

## Steps

1. **Read** the reviewer's `## Review Checklist` in the task file. Each item is a
   discrete, required change.
2. **Address each item** exactly — do not add unrequested changes.
3. **Verify** after each fix: build, lint, run tests.
4. **Escalate** any checklist item that would require an architecture,
   convention, or ADR change — those are Claude decisions, not the executor's.
5. **Re-submit**: when every item is resolved and the tree is green, move the
   task file from `.strix/tasks/active/` to `.strix/tasks/review/` and set
   `Status: In Review`. If you cannot move files, print the exact `git mv`
   command for the human.

## Guardrails

- Scope is the checklist, nothing more. New scope needs a new task.
- Repeatedly bouncing on the same item signals a task/design problem — escalate
  rather than guess.
