---
name: typescript
description: Use when a task involves writing or refactoring TypeScript — precise types, generics, or compiler strictness.
---

# TypeScript

Write correctly-typed code — precise types, no unsafe casts — matching the project's tsconfig strictness.

## When To Use
Task's Suggested Skills include `typescript` (usually alongside react/node).

## Inputs / Outputs
- **In:** task Requirements, existing types, conventions.
- **Out:** typed code that compiles cleanly under the project's strictness.

## Rules

**Do**
- Prefer precise types and unions over `any`.
- Narrow with guards; avoid `as` unless unavoidable.
- Keep public types explicit at module boundaries.

**Don't**
- Don't disable strict flags to make errors go away.
- Don't add generic type machinery the task doesn't need.
- Don't change tsconfig conventions (escalate).

## Commands

```bash
npx tsc --noEmit       # type-check only
npm run build          # compile
npm run lint           # eslint (+ type-aware rules)
```

Respect the project's tsconfig; escalate if strictness must change.

## Examples

**Discriminated union** — model a result as `{ok:true,value} | {ok:false,error}` instead of nullable fields; the compiler enforces handling.

**Narrowing over casting** — use type guards to narrow `unknown` rather than `as` casts.

## Checklist

- [ ] No `any` / unsafe casts introduced
- [ ] Types narrowed with guards
- [ ] Boundary types explicit
- [ ] tsc --noEmit passes
- [ ] Lint green
- [ ] tsconfig unchanged (or escalated)
