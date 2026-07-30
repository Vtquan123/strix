# Workflow

How a request becomes shipped, reviewed, knowledge-governed code.

## Task-Driven, Always

Nothing runs without a task. Every request is triaged by Claude, classified, and
turned into one or more tasks before Cline touches anything. Canonical:
[../workflow/task-driven-workflow.md](../workflow/task-driven-workflow.md).

## Complexity Levels

| Level | Meaning | Path |
|-------|---------|------|
| TRIVIAL | One obvious edit | Straight to a one-line task |
| SIMPLE | One change, one skill | Single task |
| STANDARD | One feature, multi-file | Full task (the atomic unit) |
| EPIC | Multi-feature | **Break into STANDARD tasks first** |

Canonical: [../workflow/complexity-levels.md](../workflow/complexity-levels.md).
**Never send an EPIC directly to Cline.**

## End-to-End

```mermaid
sequenceDiagram
    actor User
    participant Router
    participant Tasks
    participant Cline
    participant Know as Knowledge
    User->>Router: request
    Router->>Router: triage (intent + complexity)
    alt EPIC
      Router->>Tasks: break into STANDARD + deps
    else STANDARD/SIMPLE/TRIVIAL
      Router->>Tasks: create task
    end
    Tasks->>Cline: hand READY task
    Cline->>Know: read-only
    Cline->>Cline: implement -> build -> lint -> test -> fix
    Cline->>Tasks: task -> Review
    Router->>Router: reviewer-agent
    alt approved
      Router->>Know: knowledge-agent updates if triggered
      Router->>Tasks: Done -> Archive
    else changes
      Router->>Cline: review-fixes
    end
    Router->>User: outcome
```

## Task Lifecycle

Queue → Active → Review → Done → Archive. Each stage is a directory under
`tasks/`. Canonical: [../workflow/task-lifecycle.md](../workflow/task-lifecycle.md).

## Runtime Boundaries

- **Claude** never writes code, builds, lints, or tests (may run the terminal on demand).
- **Cline** never redesigns, changes conventions/knowledge/ADRs, or expands
  scope.

Canonical: [../workflow/runtime-separation.md](../workflow/runtime-separation.md).

## Cline Workflows

`implement` · `fix` · `refactor` · `testing` · `review-fixes` —
[../../templates/cline/.clinerules/workflows/](../../templates/cline/.clinerules/workflows/).
