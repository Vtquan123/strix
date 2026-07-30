# Knowledge

The Project Knowledge Layer is Strix's **source of truth**. Claude reads and
writes it; Cline reads it only. This asymmetry keeps knowledge coherent — it is
reasoning output, not an implementation side effect.

## Structure

```text
knowledge/
├── project-context.md      # current state of the project
├── coding-conventions.md   # single source of truth for how code is written
├── architecture.md         # current architecture + diagrams
├── glossary.md             # business terminology
└── decisions/              # ADRs (one decision per file)
```

## Access

| File | Claude | Cline | Why |
|------|:------:|:-----:|-----|
| project-context.md | R/W | R | Knowledge is reasoning output; one writer prevents drift |
| coding-conventions.md | R/W | R | Conventions are decisions, not implementation details |
| architecture.md | R/W | R | Structure is designed, then implemented |
| glossary.md | R/W | R | Shared vocabulary owned by planning |
| decisions/* | R/W | R | ADRs are immutable records Claude authors |

**Why Cline is read-only:** if execution could rewrite knowledge, the source of
truth would drift with every implementation detail and stop being trustworthy.

## The Files

- **project-context.md** — product summary, business domain, tech stack, folder
  structure, current modules, current progress, important constraints.
- **coding-conventions.md** — naming, folders, components, API, testing, git,
  security. Single source of truth; only Claude updates it.
- **architecture.md** — current architecture, with diagrams kept in sync.
- **glossary.md** — business terminology.
- **decisions/** — ADRs; template at
  [../../templates/strix/knowledge/decisions/0000-adr-template.md](../../templates/strix/knowledge/decisions/0000-adr-template.md).

## Governance

When to update — and when **not** to — is defined in
[governance.md](./governance.md) and enforced by `knowledge-agent`.

- **Must update:** architecture, convention, module, business rule, EPIC
  completion, tech stack.
- **Never update:** typo, rename, CSS fix, minor bug.
