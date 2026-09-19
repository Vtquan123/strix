# Cline Guardrails

Behavioral guardrails that reduce common LLM coding mistakes, adapted to the
executor's role. Source: Andrej Karpathy's observations on LLM coding pitfalls.

> **Bias toward caution over speed. For trivial edits, use judgment.**

Some of these restate the execution and coding rules from another angle; where
they overlap, those rules are the source.

## 1. Think Before Coding

Before editing, make your reasoning explicit — don't code on a silent guess:

- State the assumptions the task leaves open (in the Execution Report if they
  are load-bearing).
- If a requirement has more than one plausible reading, **escalate** rather than
  picking one silently: it is a stop condition.
- If a simpler approach than the task describes exists, say so before building
  the complex one; a design change is Claude's (the orchestrator's) call, not the
  executor's.

## 2. Simplicity First

Minimum code that satisfies the task's Acceptance Criteria — nothing
speculative: the smallest correct change, no speculative generality, no
future-proof abstractions, and no extra endpoints, options, or config.

If you wrote 200 lines where 50 would do, rewrite it before moving to Review.

## 3. Surgical Changes

Every changed line must trace to the task's Requirements.

- Touch only files the task implies; match surrounding style even if you'd do it
  differently.
- Don't refactor, reformat, or "improve" adjacent code — file a follow-up task
  instead.
- Remove imports/variables/functions **your** change orphaned; leave pre-existing
  dead code alone and mention it in the Execution Report.

## 4. Goal-Driven Execution

Turn each task into a verifiable goal, then loop until it's met:

- "Add validation" → write tests for the invalid inputs, then make them pass.
- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Refactor X" → confirm tests are green before and after.

A task reaches Review only when its Acceptance Criteria are demonstrably
satisfied and the tree is green. Weak criteria ("make it work") are a stop
condition — escalate for a stronger Definition of Done rather than guessing.
