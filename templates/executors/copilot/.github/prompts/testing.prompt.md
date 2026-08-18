---
agent: agent
description: Add or strengthen tests for existing or new code (testing workflow) to meet the task's coverage criteria.
---
Task file: ${input:task:absolute or repo-relative path to the READY testing task in .strix/tasks/active/}

Add or strengthen tests as defined by the task above. Follow the always-on Strix
executor instructions in `.github/copilot-instructions.md`.

## Steps

1. **Read** the task; identify the units and the Acceptance Criteria that define
   "adequately tested".
2. **Design cases**: happy path, boundaries, error handling, and state
   transitions.
3. **Write tests** following the project's test conventions
   (`.strix/knowledge/coding-conventions.md`).
4. **Run** the suite; ensure new tests pass and nothing regresses.
5. **If a test uncovers a real defect**, do not silently patch scope — surface
   it: attach a note and, per the Router, spin a `fix` task.
6. **Complete**: when the coverage/criteria target is met, move the task file
   from `.strix/tasks/active/` to `.strix/tasks/review/` and set
   `Status: In Review`. If you cannot move files, print the exact `git mv`
   command for the human.

## Guardrails

- Tests assert real behaviour, not implementation trivia.
- Meeting a coverage number by testing nothing meaningful fails review.
