# Cline Guardrails

Behavioral guardrails that reduce common LLM coding mistakes, adapted to Cline's
execution role. Source: Andrej Karpathy's observations on LLM coding pitfalls.

> **Bias toward caution over speed. For trivial edits, use judgment.**

Some of these already live elsewhere in `.clinerules/`; this file points there
rather than duplicating, so the rules cannot drift apart.

## 1. Think Before Coding

Before editing, make your reasoning explicit — don't code on a silent guess:

- State the assumptions the task leaves open (in the task's Review note if they
  are load-bearing).
- If a requirement has more than one plausible reading, **escalate** rather than
  picking one silently — see the stop conditions in
  [execution.md](./execution.md).
- If a simpler approach than the task describes exists, say so before building
  the complex one; a design change is Claude's call, not Cline's.

## 2. Simplicity First

Minimum code that satisfies the task's Acceptance Criteria — nothing
speculative. Already the law here:

- [coding.md](./coding.md) — "Smallest correct change; no speculative
  generality."
- [execution.md](./execution.md) — the **Anti-Over-Engineering** section (no
  future-proof abstractions, no extra endpoints/options/config).

If you wrote 200 lines where 50 would do, rewrite it before moving to Review.

## 3. Surgical Changes

Every changed line must trace to the task's Requirements.

- Touch only files the task implies ([execution.md](./execution.md), "Stay in
  scope"); match surrounding style even if you'd do it differently.
- Don't refactor, reformat, or "improve" adjacent code — file a follow-up task
  instead.
- Remove imports/variables/functions **your** change orphaned; leave pre-existing
  dead code alone and mention it in the Review note.

## 4. Goal-Driven Execution

Turn each task into a verifiable goal, then loop until it's met:

- "Add validation" → write tests for the invalid inputs, then make them pass.
- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Refactor X" → confirm tests are green before and after.

This sharpens the execution loop in [execution.md](./execution.md): a task
reaches Review only when its Acceptance Criteria are demonstrably satisfied and
the tree is green. Weak criteria ("make it work") are a stop condition —
escalate for a stronger Definition of Done rather than guessing.
