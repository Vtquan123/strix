# Project Context

> **Purpose:** the current state of the project. The single place to learn "what
> is this and where is it now" without reading the whole codebase.
> **Writer:** Claude (`knowledge-agent`). **Readers:** Claude, the executor (read-only).

<!--
This is a TEMPLATE. When Strix is adopted by a real project, the
knowledge-agent fills each section. Keep it current; it is loaded (in part) into
almost every routing decision, so keep it tight.
-->

## Product Summary

_One paragraph: what the product does and for whom._

## Business Domain

_The domain this software operates in and the core problems it solves.
Link domain terms to [glossary.md](./glossary.md)._

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language | _e.g. TypeScript_ | |
| Frontend | _e.g. React / Next.js_ | |
| Backend | _e.g. Node_ | |
| Data | _e.g. PostgreSQL_ | |
| Infra | _e.g. Docker_ | |
| Testing | _e.g. Vitest / Playwright_ | |

## Folder Structure

```text
_top-level layout of the target project_
```

## Current Modules

| Module | Responsibility | Status |
|--------|----------------|--------|
| _module_ | _what it does_ | _active / planned / deprecated_ |

## Current Progress

_What is built, what is in flight, what is next. Updated on EPIC completion._

## Important Constraints

- _Performance, compliance, budget, deadline, or platform constraints._
- _Anything the executor must respect but cannot infer from code._

---

**Governance:** update this file for module, tech-stack, business-rule, or
progress changes; do **not** touch it for typos, renames, CSS, or minor bugs.
See the governance policy in the Strix plugin `reference/docs/governance.md`.
