---
name: project-scan
description: Perform the one-time initial adoption scan of an existing codebase — read the real project (tech stack, structure, conventions, architecture, domain terms) and populate .strix/knowledge/* plus an adoption ADR from evidence. Use when Strix is first brought into a real project and .strix/knowledge/ is still template placeholders; not for ongoing post-task updates (use knowledge-update for those).
metadata:
  kind: reasoning
  engine: claude
---

# Project Scan

## Purpose
Bootstrap the Project Knowledge Layer for a real codebase. Read the actual
project and replace the `.strix/knowledge/*` template placeholders with evidence-based
facts, so Cline and every reasoning skill start from accurate ground truth
instead of scaffolding. This is a one-time adoption event, not the ongoing
governance loop.

## When to use
- The user brings Strix into an existing/real project for the first time and
  `.strix/knowledge/*` still holds template placeholders (`_e.g. …_`, generic diagrams).
- Invoked explicitly by the user or by the Router recognising an `onboarding`
  intent ("scan/adopt this project", "populate the knowledge base").
- **Not** for ongoing changes after a task ships — that is
  [knowledge-update](../knowledge-update/SKILL.md). A re-scan of an already-
  populated layer is a governed refresh, not a fresh scan.

## Inputs / Outputs
- **In:** read-only access to the target repo — source tree, package manifests
  (`package.json`, `pyproject.toml`, `go.mod`, …), lockfiles, linter/formatter
  configs, CI config, existing READMEs/docs; current `.strix/knowledge/*` templates.
- **Out:** populated `project-context.md`, `architecture.md`,
  `coding-conventions.md`, `glossary.md`, plus a new
  `.strix/knowledge/decisions/NNNN-adopt-<project>.md` ADR recording the scan.

## Procedure
1. **Inventory** — read manifests, lockfiles, and configs to identify languages,
   frameworks, and tooling; map the folder layout, entry points, and test setup.
2. **project-context.md** — fill Product Summary, Business Domain, Tech Stack
   table, Folder Structure, Current Modules, Current Progress, Important
   Constraints from what the repo actually contains.
3. **architecture.md** — replace the placeholder diagrams with the real
   component map and key-flow sequence diagrams, traced from actual code paths.
4. **coding-conventions.md** — infer real naming/folder/component/API/testing/
   git/security conventions from linter configs, CI checks, and existing code
   patterns. Never invent a convention the repo does not exhibit.
5. **glossary.md** — pull real domain terms from identifiers, docs, and comments.
6. **Adoption ADR** — author `.strix/knowledge/decisions/NNNN-adopt-<project>.md`
   (per the [decisions README](.strix/knowledge/decisions/README.md) numbering):
   what was scanned, confidence per file, and anything left `n/a` for lack of
   evidence.

_Terminal may be run read-only to inspect the repo. No source edits, no
build/lint/test — reasoning + knowledge authoring only._

## Rules
**Do**
- Populate every fact from repo evidence; cite where it came from when unclear.
- Mark uncertain inferences explicitly; leave a section a placeholder or `n/a`
  when the repo gives no evidence.
- Keep `architecture.md` diagrams true to the real code paths.
- Conclude with the adoption ADR so the scan itself is auditable.

**Don't**
- Don't invent a tech stack, module, or convention the repo does not exhibit.
- Don't touch `.strix/tasks/**`, `.claude/**`, `.clinerules/**`, or any source file.
- Don't let Cline write knowledge — Claude only.
- Don't re-scan an already-populated layer; route that through
  [knowledge-update](../knowledge-update/SKILL.md).

## Checklist
- [ ] Repo inventoried (manifests, configs, layout, tests, CI)
- [ ] `project-context.md` populated from evidence
- [ ] `architecture.md` diagrams reflect real code paths
- [ ] `coding-conventions.md` inferred from configs + real patterns
- [ ] `glossary.md` seeded with real domain terms
- [ ] Unsupported sections left placeholder / `n/a` (never fabricated)
- [ ] Adoption ADR authored + indexed in `decisions/README.md`

## Examples
### Node/TypeScript service → full population
Manifests show `typescript`, `express`, `jest`, an ESLint config, and a
`src/{routes,services,repositories}` layout. Populate the Tech Stack table,
draw the real request→service→repo→DB flow in `architecture.md`, capture the
ESLint-enforced naming in `coding-conventions.md`, and record an
`0002-adopt-<project>.md` ADR.

### Sparse repo → partial population
A prototype has code but no linter, no tests, no docs. Populate stack + folder
structure; leave Testing and Security conventions as `n/a`; note the gaps in the
adoption ADR rather than inventing conventions.

## Related
[knowledge-update](../knowledge-update/SKILL.md) · [architecture](../architecture/SKILL.md) · [adr](../adr/SKILL.md) · [documentation](../documentation/SKILL.md)
