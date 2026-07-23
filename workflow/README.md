# Strix Workflow Core

The `workflow/` directory is the **engine-agnostic core** of Strix. It defines
*how* work moves through the system without hard-coding *which* engine performs
it. Engines (Claude, Cline, and any future engine) are described declaratively
in the [Capability Matrix](./capability-matrix.md); every other component reads
that matrix instead of naming an engine directly.

## Design Principles

Strix is built on eleven principles. Every file in this repository must be
traceable back to one of them.

1. **Task-Driven Architecture** — nothing is implemented that is not first a task.
2. **Hybrid Workflow** — reasoning and execution are two distinct runtimes.
3. **Layered Architecture** — seven layers, each with one responsibility.
4. **Router-Based Decision Making** — a single Router decides; agents never self-select.
5. **Skill-First Design** — reusable skills carry the how-to; prompts stay small.
6. **Knowledge-Driven Development** — the knowledge layer is the source of truth.
7. **Claude Thinks.** — Claude owns reasoning.
8. **Cline Executes.** — Cline owns execution.
9. **Minimize context.** — load only the knowledge and skills a task needs.
10. **Prevent over-engineering.** — implement only what the task defines.
11. **Long-term maintainability.** — modular, extensible, no duplicated responsibility.

## The Seven Layers

```mermaid
flowchart TD
    U[1. User] --> R[2. Claude Triage Router]
    R --> TM[3. Task Management Layer]
    TM --> PK[4. Project Knowledge Layer]
    PK --> AG[5. Agent Layer]
    AG --> SK[6. Skill Layer]
    SK --> IN[7. Infrastructure Layer]

    classDef think fill:#e8f0fe,stroke:#4285f4,color:#1a1a1a;
    classDef exec fill:#fde8e8,stroke:#ea4335,color:#1a1a1a;
    classDef neutral fill:#f1f3f4,stroke:#9aa0a6,color:#1a1a1a;
    class U neutral;
    class R,TM,PK think;
    class AG,SK neutral;
    class IN exec;
```

| # | Layer | Responsibility | Owner |
|---|-------|----------------|-------|
| 1 | User | Submits requests in natural language | Human |
| 2 | Claude Triage Router | Classifies, routes, selects skills/context/agents | Claude |
| 3 | Task Management Layer | Holds tasks and moves them through the lifecycle | Claude writes, Cline reads |
| 4 | Project Knowledge Layer | Source of truth for context, conventions, architecture, ADRs | Claude writes, Cline reads |
| 5 | Agent Layer | Specialised Claude reasoning agents | Claude |
| 6 | Skill Layer | Reusable reasoning + implementation skills | Both (by kind) |
| 7 | Infrastructure Layer | Files, terminal, build, lint, test, VCS | Cline |

## End-to-End Flow

```mermaid
sequenceDiagram
    actor User
    participant Router as Claude Triage Router
    participant Tasks as Task Management
    participant Know as Knowledge
    participant Cline as Cline (Execution)

    User->>Router: Request (natural language)
    Router->>Router: Intent + Complexity detection
    Router->>Know: Read relevant context
    Router->>Tasks: Create task(s) via task-creator-agent
    Note over Router,Tasks: EPIC is split into STANDARD tasks first
    Tasks-->>Cline: Hand off a READY task
    Cline->>Know: Read-only (context, conventions, ADRs)
    Cline->>Cline: Implement, build, lint, test, fix
    Cline-->>Tasks: Move task to Review
    Router->>Router: reviewer-agent reviews
    alt Approved
        Router->>Know: knowledge-agent updates (if warranted)
        Router->>Tasks: Move to Done -> Archive
    else Changes requested
        Router->>Cline: review-fixes workflow
    end
    Router-->>User: Report outcome
```

## Where To Look Next

- Runtime boundaries → [runtime-separation.md](./runtime-separation.md)
- How requests are sized → [complexity-levels.md](./complexity-levels.md)
- How work is structured → [task-driven-workflow.md](./task-driven-workflow.md)
- How a task travels → [task-lifecycle.md](./task-lifecycle.md)
- Who can do what → [capability-matrix.md](./capability-matrix.md)
- How routing decides → [router.md](./router.md)
