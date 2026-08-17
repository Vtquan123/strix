# Rules

Rules bind each engine to its runtime. Claude rules live in `.claude/rules/`;
the executor's rules live in its config directory (for the Cline profile,
`.clinerules/` at the repo root, which Cline auto-loads). They are derived from
the [capability matrix](../workflow/capability-matrix.md), which is authoritative.

## Claude Rules — `.claude/rules/`

| File | Describes |
|------|-----------|
| [identity.md](../rules/identity.md) | Who Claude is: the reasoning engine; what it owns and never does |
| [workflow.md](../rules/workflow.md) | How Claude processes a request end to end |
| [permissions.md](../rules/permissions.md) | Allowed/forbidden actions for the Planning Runtime |
| [routing.md](../rules/routing.md) | The five routing functions + routing table |
| [knowledge.md](../rules/knowledge.md) | When/how Claude updates knowledge; read-only map |

**Core:** Claude thinks, delegates, and never writes code, builds, lints, or
tests. It may run the terminal on demand (shared with the executor).

## Executor Rules

These are the executor's rule files. The table links the **Cline** profile (one
example executor); the Copilot and Claude executors have equivalents under
`.github/` and `.strix/executor/` respectively.

| File | Describes |
|------|-----------|
| [identity.md](../../templates/executors/cline/.clinerules/identity.md) | Who the executor is: the implementation engine; owns/never |
| [workflow.md](../../templates/executors/cline/.clinerules/workflow.md) | How the executor processes one task Active → Review |
| [permissions.md](../../templates/executors/cline/.clinerules/permissions.md) | Allowed/forbidden actions for the Execution Runtime |
| [execution.md](../../templates/executors/cline/.clinerules/execution.md) | The build/lint/test loop + stop conditions |
| [coding.md](../../templates/executors/cline/.clinerules/coding.md) | Applying `coding-conventions.md` during implementation |

**Core:** The executor executes only what the task defines and never redesigns,
changes conventions/knowledge/ADRs, or expands scope.

## Executor Workflows

These are the executor's workflow files. The table links the **Cline** profile
(one example executor); the Copilot and Claude executors have equivalents in
their own config directories (`.github/` and `.strix/executor/` respectively).

| Workflow | Use |
|----------|-----|
| [implement.md](../../templates/executors/cline/.clinerules/workflows/implement.md) | Build a new feature |
| [fix.md](../../templates/executors/cline/.clinerules/workflows/fix.md) | Resolve a defect |
| [refactor.md](../../templates/executors/cline/.clinerules/workflows/refactor.md) | Restructure without behaviour change |
| [testing.md](../../templates/executors/cline/.clinerules/workflows/testing.md) | Add/strengthen tests |
| [review-fixes.md](../../templates/executors/cline/.clinerules/workflows/review-fixes.md) | Apply reviewer changes |

## Why Rules Are Split

Splitting rules by engine and deriving them from the capability matrix means a
new engine gets its own rules directory and matrix column — no existing rule is
rewritten. This satisfies the "support future engines" quality requirement.
