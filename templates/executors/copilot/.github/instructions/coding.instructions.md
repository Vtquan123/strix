---
applyTo: "**"
---
# Strix coding conventions (executor)

When editing any source file in this repository as the Strix executor:

- `.strix/knowledge/coding-conventions.md` is the authoritative style source and
  **wins** on naming, structure, components, APIs, testing, git, and security.
  Read it; never edit it (a needed change is escalated to Claude).
- Match the surrounding code exactly: same idioms, comment density, and naming.
  No new casing styles; place files where the convention and existing tree
  dictate.
- Smallest correct change; no speculative generality. Handle the error paths the
  task specifies — no more, no less. Add/update tests as the task's Acceptance
  Criteria require.
- When a convention is silent, prefer the pattern already used nearby; if a real
  decision is needed, escalate — do not invent a convention.
