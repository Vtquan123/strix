# Coding Conventions

> **Single source of truth** for how code is written in this project.
> **Writer:** Claude only. **Readers:** Claude, Cline (read-only, binding).

<!--
This is a TEMPLATE. Fill each section for the target project. Cline treats this
file as law and will escalate rather than deviate.
-->

## Naming

- Variables / functions: _convention (e.g. camelCase)_
- Types / classes / components: _convention (e.g. PascalCase)_
- Constants: _convention_
- Files: _convention_
- Booleans, handlers, async: _prefixes/suffixes_

## Folder Conventions

- Where features, shared code, and tests live.
- Barrel/index policy.
- Co-location rules (tests, styles, stories next to code?).

## Component Conventions

- Component shape and file layout.
- Props typing and defaults.
- State/effuse boundaries; container vs presentational policy.

## API Conventions

- Request/response shape.
- Error format and status-code policy.
- Validation and auth expectations.
- Versioning.

## Testing Conventions

- Framework(s) and file naming.
- Coverage expectations.
- Unit vs integration vs e2e boundaries.
- What must always be tested (e.g. every bug gets a regression test).

## Git Conventions

- Branch naming.
- Commit message format (e.g. Conventional Commits).
- PR size and review policy.

## Security Conventions

- Secret handling.
- Input validation and output encoding.
- AuthN/AuthZ patterns.
- Dependency and data-handling rules.

---

**Governance:** only Claude updates conventions. A convention change is a
reasoned decision and often warrants an [ADR](./decisions/). Cline never edits
this file — it escalates instead. See [../docs/governance.md](../docs/governance.md).
