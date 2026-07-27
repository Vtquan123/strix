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

| To add… | Do this |
|---------|---------|
| A **skill** | Reasoning: create `.claude/skills/<name>/` with the five-file contract. Implementation: create `.cline/skills/<name>/SKILL.md` with `name`+`description` frontmatter (use `cline-skill-handler`); reference it in `.claude/rules/routing.md` |
| An **agent** | Add `.claude/agents/<name>.md` (reasoning only — no coding agents) |
| A **Cline workflow** | Add `.clinerules/workflows/<name>.md` describing its execution flow |
| A **capability** | Add a row to `workflow/capability-matrix.md`; rules read it |
| A **future engine** | Add a column to the capability matrix + its own rules dir — no existing rule changes |
| A **convention** | Update `knowledge/coding-conventions.md` (Claude only) + often an ADR |

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
.cline/skills/   Cline implementation skills (SKILL.md per skill)
tasks/       the task board (queue/active/review/done/archive)
docs/        this documentation set
```
