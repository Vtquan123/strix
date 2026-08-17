# Workflow

How a request becomes shipped, reviewed, knowledge-governed code.

## Task-Driven, Always

Nothing runs without a task. Every request is triaged by Claude, classified, and
turned into one or more tasks before the executor touches anything. Canonical:
[../workflow/task-driven-workflow.md](../workflow/task-driven-workflow.md).

## Complexity Levels

| Level | Meaning | Path |
|-------|---------|------|
| TRIVIAL | One obvious edit | Straight to a one-line task |
| SIMPLE | One change, one skill | Single task |
| STANDARD | One feature, multi-file | Full task (the atomic unit) |
| EPIC | Multi-feature | **Break into STANDARD tasks first** |

Canonical: [../workflow/complexity-levels.md](../workflow/complexity-levels.md).
**Never send an EPIC directly to the executor.**

## End-to-End

```mermaid
sequenceDiagram
    actor User
    participant Router
    participant Tasks
    participant Executor
    participant Know as Knowledge
    User->>Router: request
    Router->>Router: triage (intent + complexity)
    alt EPIC
      Router->>Tasks: break into STANDARD + deps
    else STANDARD/SIMPLE/TRIVIAL
      Router->>Tasks: create task
    end
    Tasks->>Executor: hand READY task
    Executor->>Know: read-only
    Executor->>Executor: implement -> build -> lint -> test -> fix
    Executor->>Tasks: task -> Review
    Router->>Router: reviewer-agent
    alt approved
      Router->>Know: knowledge-agent updates if triggered
      Router->>Tasks: Done -> Archive
    else changes
      Router->>Executor: review-fixes
    end
    Router->>User: outcome
```

## Task Lifecycle

Queue → Active → Review → Done → Archive. Each stage is a directory under
`tasks/`. Canonical: [../workflow/task-lifecycle.md](../workflow/task-lifecycle.md).

## Runtime Boundaries

- **Claude** never writes code, builds, lints, or tests (may run the terminal on demand).
- **The executor** never redesigns, changes conventions/knowledge/ADRs, or expands
  scope.

Canonical: [../workflow/runtime-separation.md](../workflow/runtime-separation.md).

## Executor Workflows

`implement` · `fix` · `refactor` · `testing` · `review-fixes` — see the Cline
profile (one example executor):
[../../templates/executors/cline/.clinerules/workflows/](../../templates/executors/cline/.clinerules/workflows/).
