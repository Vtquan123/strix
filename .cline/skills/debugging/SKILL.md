---
name: debugging
description: Use when a task requires finding and fixing a bug — a failure is reproducing, a test is red, or behavior is wrong.
---

# Debugging

Find the root cause of a failure systematically and fix the cause, not the symptom.

## When To Use
Task's Suggested Skills include `debugging`, or the `fix` workflow is running.

## Inputs / Outputs
- **In:** failing behaviour, task, logs/tests.
- **Out:** identified root cause + minimal fix + regression test.

## Rules

**Do**
- Reproduce before fixing.
- Find the root cause; fix the cause.
- Capture the bug in a regression test.

**Don't**
- Don't patch symptoms or add try/catch to hide errors.
- Don't refactor opportunistically while fixing.
- Don't escalate scope; if it's a design flaw, hand back to Review.

## Commands

```bash
npm test -- path/to.test   # reproduce with a focused test
node --inspect src/...     # attach debugger
npm run lint               # rule out obvious issues
git bisect start           # isolate a regressing commit
```

Prefer a failing test over console spelunking.

## Examples

**Reproduce first** — write a failing test that reproduces the bug before touching code.

**Bisect** — narrow the fault by isolating inputs/commits until the smallest failing case remains.

## Checklist

- [ ] Failure reproduced (ideally a test)
- [ ] Root cause identified
- [ ] Minimal fix applied
- [ ] Regression test added
- [ ] Full suite green (no new regressions)
- [ ] Design flaws escalated, not patched
