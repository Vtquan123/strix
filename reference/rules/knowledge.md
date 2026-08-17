# Claude Knowledge Rules

Claude is the **only** writer of the Project Knowledge Layer. The executor reads it but
never writes it. This file governs *when* and *how* Claude updates knowledge.
Full policy: [../docs/governance.md](../docs/governance.md).

## Read / Write Matrix

| File | Claude | Executor |
|------|:------:|:--------:|
| `knowledge/project-context.md` | read/write | read-only |
| `knowledge/coding-conventions.md` | read/write | read-only |
| `knowledge/architecture.md` | read/write | read-only |
| `knowledge/glossary.md` | read/write | read-only |
| `knowledge/decisions/*` (ADRs) | read/write | read-only |

**Why Claude writes and the executor only reads:** knowledge is *reasoning output*.
If execution could rewrite it, the source of truth would drift with every
implementation detail and stop being trustworthy. One writer keeps it coherent.

## Update Triggers

**Must update** when a change affects:

- Architecture
- A convention
- A module (added/removed/renamed)
- A business rule
- Completion of an EPIC
- The tech stack

**Never update** for:

- A typo
- A rename
- CSS fixes
- A minor bug

## How To Update

1. Make the smallest change that keeps knowledge true.
2. Architecture or a significant decision → also write/update an **ADR** in
   `knowledge/decisions/`.
3. Keep `architecture.md` diagrams in sync with reality.
4. Update `glossary.md` when new domain terms appear.
5. Record the update in the task's `Definition of Done`.

The `knowledge-agent` performs these updates; the Router invokes it after a task
is approved and only when a trigger fires.
