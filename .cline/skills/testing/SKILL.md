---
name: testing
description: Use when a task requires writing or updating tests — any task with test Acceptance Criteria or a bug that needs a regression test.
---

# Testing

Design and write tests that assert real behaviour — happy path, edges, errors, state transitions — to the project's coverage bar.

## When To Use
Task's Suggested Skills include `testing`, or any task with test Acceptance Criteria.

## Inputs / Outputs
- **In:** task Acceptance Criteria, test conventions.
- **Out:** passing tests that would catch regressions.

## Rules

**Do**
- Cover happy path, boundaries, errors, and state transitions.
- Add a regression test for every bug.
- Follow the project's test structure + naming.

**Don't**
- Don't test implementation trivia to hit a coverage number.
- Don't leave flaky/time-dependent tests.
- Don't skip tests the Acceptance Criteria require.

## Commands

```bash
npm test                 # run suite
npm test -- --coverage   # coverage report
npm test -- path/to.test # focused run
```

Match the project's runner (vitest/jest/playwright).

## Examples

**Boundary cases** — for a rate limiter: test under-limit, at-limit, over-limit, and reset.

**Regression test** — every bug fix adds a test that fails before the fix and passes after.

## Checklist

- [ ] Happy path covered
- [ ] Boundaries + error paths covered
- [ ] State transitions covered
- [ ] Regression test added for bugs
- [ ] No flaky/time-dependent tests
- [ ] Suite green + coverage bar met
