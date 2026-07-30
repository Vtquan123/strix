# Rules

Rules bind each engine to its runtime. Claude rules live in `.claude/rules/`;
Cline rules live in `.clinerules/` (repo root, so Cline auto-loads them). They
are derived from the
[capability matrix](../workflow/capability-matrix.md), which is authoritative.

## Claude Rules — `.claude/rules/`

| File | Describes |
|------|-----------|
| [identity.md](../rules/identity.md) | Who Claude is: the reasoning engine; what it owns and never does |
| [workflow.md](../rules/workflow.md) | How Claude processes a request end to end |
| [permissions.md](../rules/permissions.md) | Allowed/forbidden actions for the Planning Runtime |
| [routing.md](../rules/routing.md) | The five routing functions + routing table |
| [knowledge.md](../rules/knowledge.md) | When/how Claude updates knowledge; read-only map |

**Core:** Claude thinks, delegates, and never writes code, builds, lints, or
tests. It may run the terminal on demand (shared with Cline).

## Cline Rules — `.clinerules/`

| File | Describes |
|------|-----------|
| [identity.md](../../templates/cline/.clinerules/identity.md) | Who Cline is: the implementation engine; owns/never |
| [workflow.md](../../templates/cline/.clinerules/workflow.md) | How Cline processes one task Active → Review |
| [permissions.md](../../templates/cline/.clinerules/permissions.md) | Allowed/forbidden actions for the Execution Runtime |
| [execution.md](../../templates/cline/.clinerules/execution.md) | The build/lint/test loop + stop conditions |
| [coding.md](../../templates/cline/.clinerules/coding.md) | Applying `coding-conventions.md` during implementation |

**Core:** Cline executes only what the task defines and never redesigns,
changes conventions/knowledge/ADRs, or expands scope.

## Cline Workflows — `.clinerules/workflows/`

| Workflow | Use |
|----------|-----|
| [implement.md](../../templates/cline/.clinerules/workflows/implement.md) | Build a new feature |
| [fix.md](../../templates/cline/.clinerules/workflows/fix.md) | Resolve a defect |
| [refactor.md](../../templates/cline/.clinerules/workflows/refactor.md) | Restructure without behaviour change |
| [testing.md](../../templates/cline/.clinerules/workflows/testing.md) | Add/strengthen tests |
| [review-fixes.md](../../templates/cline/.clinerules/workflows/review-fixes.md) | Apply reviewer changes |

## Why Rules Are Split

Splitting rules by engine and deriving them from the capability matrix means a
new engine gets its own rules directory and matrix column — no existing rule is
rewritten. This satisfies the "support future engines" quality requirement.
