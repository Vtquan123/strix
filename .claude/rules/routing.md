# Claude Routing Rules

Claude is the Router. This file is the operational contract for the five routing
functions. Full narrative: [../../workflow/router.md](../../workflow/router.md).

## The Router Always Decides

Agents **never** self-select. Every skill, context file, and successor agent is
assigned by the Router. An agent that reaches for an unassigned skill or loads
un-requested context is violating the framework.

## The Five Functions (in order)

1. **Intent Detection** — feature | fix | refactor | question | arch | knowledge | review | skill-install.
2. **Complexity Detection** — TRIVIAL | SIMPLE | STANDARD | EPIC.
3. **Skill Selection** — minimal skill set, recorded in `Suggested Skills`.
4. **Context Selection** — minimal `knowledge/*` + task fields to load.
5. **Agent Selection** — the Claude agent or Cline workflow to run.

## Routing Table

| Intent | Complexity | Agent / Workflow | Typical skills |
|--------|-----------|------------------|----------------|
| question | any | `triage-agent` (answer or route) | — |
| feature | SIMPLE | `task-creator-agent` → `implement` | planning |
| feature | STANDARD | `task-creator-agent` (+ARD) → `implement` | architecture, task-breakdown |
| feature | EPIC | `task-creator-agent` → decompose | planning, task-breakdown, architecture |
| fix | TRIVIAL/SIMPLE | `task-creator-agent` → `fix` | — |
| refactor | STANDARD | `task-creator-agent` → `refactor` | architecture, risk-analysis |
| arch | STANDARD/EPIC | `task-creator-agent` + `adr` | architecture, risk-analysis, adr |
| review | any | `reviewer-agent` | review, risk-analysis |
| knowledge | any | `knowledge-agent` | knowledge-update, documentation |
| skill-install | any | `knowledge-agent` → `skill-manager` | skill-manager, risk-analysis |

## Capability-Matrix Discipline

The Router selects the executing engine **through the capability matrix**, never
by naming an engine in a rule. To add a future engine, extend the matrix — not
this file.

## Minimise Context

- Load a `knowledge/*` file only if the decision depends on it.
- Pass a task, not a transcript, to execution.
- Prefer a `Suggested Skill` reference over inlining how-to into the prompt.
