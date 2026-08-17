---
mode: agent
description: Improve internal structure without changing behaviour (refactor workflow), preserving the task's invariants.
---
Task file: ${input:task:absolute or repo-relative path to the READY refactor task in .strix/tasks/active/}

Improve internal structure **without changing external behaviour**, as defined by
the task above. Follow the always-on Strix executor instructions in
`.github/copilot-instructions.md`.

## Steps

1. **Read** the task; identify the target and the **invariants** that must not
   change (public APIs, outputs, side effects).
2. **Safety net**: confirm tests cover current behaviour; if gaps exist and the
   task allows, add characterization tests first.
3. **Refactor in small, verified steps.** Never mix a behaviour change into a
   refactor.
4. **Verify after each step**: build, lint, run tests. Behaviour must stay
   identical.
5. **Escalate** if the "refactor" actually requires a design change or new ADR —
   that is a Planning-Runtime decision.
6. **Complete**: move the task file from `.strix/tasks/active/` to
   `.strix/tasks/review/` and set `Status: In Review`. If you cannot move files,
   print the exact `git mv` command for the human.

## Guardrails

- A refactor that changes behaviour is out of scope by definition.
- No new features. No convention changes.
