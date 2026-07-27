---
name: react
description: Use when a task involves building or modifying React components, state management, or UI behaviour.
---

# React

Build and modify React components that match the project's component conventions, with correct state, effects, and accessibility.

## When To Use
Task's Suggested Skills include `react` and UI components are involved.

## Inputs / Outputs
- **In:** task Requirements, `coding-conventions.md` (component rules).
- **Out:** components + tests, green build/lint.

## Rules

**Do**
- Match the established component shape (container vs presentational).
- Keep components small; derive state, don't duplicate it.
- Handle loading/error/empty states the task specifies.
- Provide labels/roles for accessibility.

**Don't**
- Don't introduce a new state library unless the task says so.
- Don't add props/options beyond Requirements (over-engineering).
- Don't change global conventions.

## Commands

```bash
npm run dev            # local dev server
npm run build          # production build
npm run lint           # eslint
npm test -- --watch    # component tests (adjust to project runner)
```

Use the project's actual scripts from package.json; do not invent new ones.

## Examples

**Controlled input** — mirror the existing form pattern; lift state per convention; add a test for value + onChange.

**Effect cleanup** — subscriptions in `useEffect` return a cleanup fn to avoid leaks; covered by a test that unmounts.

## Checklist

- [ ] Follows component conventions
- [ ] Loading/error/empty states handled
- [ ] Accessible (labels/roles/keyboard)
- [ ] Tests for behaviour added
- [ ] Build + lint green
- [ ] No out-of-scope props/features
