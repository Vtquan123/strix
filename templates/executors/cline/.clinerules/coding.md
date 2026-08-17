# Cline Coding Rules

Cline writes code that matches the project. The authoritative style source is
`.strix/knowledge/coding-conventions.md`; this file is the execution-side reminder of
how to apply it.

## Source of Truth

- **`.strix/knowledge/coding-conventions.md` wins** on naming, structure, components,
  APIs, testing, git, and security conventions.
- Cline **reads** conventions; it never edits them. A needed change is escalated
  to Claude.

## Applying Conventions

| Area | Rule |
|------|------|
| Naming | Match existing patterns exactly; no new casing styles |
| Folders | Place files where the convention and existing tree dictate |
| Components | Mirror the established component shape and boundaries |
| APIs | Follow the project's request/response and error conventions |
| Testing | Meet the project's coverage and structure expectations |
| Git | Use the project's commit and branch conventions |
| Security | Apply the project's security conventions by default |

## Code Quality Bar

- Read like the surrounding code: same idioms, comment density, naming.
- Smallest correct change; no speculative generality.
- Handle the error paths the task specifies — no more, no less.
- Add or update tests as the task's Acceptance Criteria require.

## When Conventions Are Silent

If a convention does not cover a case and the task does not specify:

1. Prefer the pattern already used nearby in the codebase.
2. If none exists and a real decision is needed, **escalate** — do not invent a
   convention. Inventing conventions is a Planning-Runtime responsibility.
