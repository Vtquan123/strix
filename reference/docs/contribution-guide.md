# Contribution Guide

How to work *inside* Strix, and how to *extend* Strix itself. The golden rule:
respect the runtime boundary — **Claude thinks, Cline executes** — and route
everything through tasks.

## Working Inside Strix (using the framework)

1. **Submit a request.** Any natural-language ask enters at the User layer.
2. **Let Claude triage.** `triage-agent` classifies intent + complexity.
3. **Get tasks, not code, from Claude.** For STANDARD+ work, `task-creator-agent`
   writes tasks; EPICs are decomposed first.
4. **Cline executes one task.** It reads the task + read-only knowledge and runs
   the right workflow (implement/fix/refactor/testing).
5. **Review.** `reviewer-agent` approves or returns a checklist.
6. **Govern knowledge.** `knowledge-agent` updates knowledge/ADRs only when a
   trigger fires.

### Do
- Keep requests scoped; let the Router size them.
- Trust the task as the single source of scope.
- Escalate design decisions to the Planning Runtime.

### Don't
- Don't ask Cline to redesign or change conventions.
- Don't hand an EPIC to execution.
- Don't edit knowledge from the execution side.

## Extending Strix (changing the framework)

> **Routing tables, the capability matrix, the skill catalog, and the task schema
> are generated.** If the text you want to change sits inside a
> `<!-- strix:gen -->` region, edit the matching `config/*.yaml` and run
> `npm run gen` — a hand edit there is reverted on the next generation. See
> [`config/README.md`](../../config/README.md).

| To add… | Do this |
|---------|---------|
| A **skill** | Reasoning: create `skills/<name>/SKILL.md` with `name`+`description`+`metadata` frontmatter, add it to `config/skills.yaml`, route it in `config/routing.yaml`, run `npm run gen`. Implementation: create `.clinerules/skills/<name>/SKILL.md` with `name`+`description` frontmatter (use `cline-skill-handler`) |
| An **agent** | Add `agents/<name>.md` (reasoning only — no coding agents) **and** add it to `agents:` in `config/skills.yaml`; the validator asserts the two match |
| A **Cline workflow** | Add `.clinerules/workflows/<name>.md` describing its execution flow |
| A **capability** | Add an entry to `capabilities:` in `config/capabilities.yaml`, with an `access:` value for every engine; run `npm run gen` |
| A **future engine** | Add it to `engines:` in `config/capabilities.yaml` + one `access:` key per capability, plus its own rules dir — no existing rule changes |
| A **convention** | Update `knowledge/coding-conventions.md` (Claude only) + often an ADR |

After any `config/*.yaml` change, `npm run check` must pass — it validates the
schemas and cross-references, then fails if the generated docs are stale.

## Principles To Preserve

Modular · easy to extend · no duplicated responsibilities · reasoning separated
from execution · small prompts · reusable context · optimized tokens · engine-
agnostic. If a change would blur `Claude Thinks / Cline Executes`, redesign the
change.

## Style

- Documentation: minimal, accurate, table- and diagram-first.
- Decisions: record significant ones as ADRs.
- Diagrams: Mermaid, kept in sync with reality.

## Where Things Live

```text
CLAUDE.md    Claude bootstrap contract (auto-loaded)
.clinerules/ Cline bootstrap rules (identity, workflow, permissions, execution, coding)
workflow/    engine-agnostic core (runtimes, lifecycle, capability matrix, router)
.claude/     Claude rules + reasoning agents + reasoning skills
.clinerules/workflows/  Cline execution workflows (implement, fix, refactor, testing, review-fixes)
knowledge/   source of truth (context, conventions, architecture, glossary, ADRs)
.clinerules/skills/   Cline implementation skills (SKILL.md per skill)
tasks/       the task board (queue/active/review/done/archive)
docs/        this documentation set
```
