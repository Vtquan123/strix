# Architecture

Strix is a **hybrid, task-driven, layered** AI coding workflow. It separates
reasoning (Claude) from execution (the executor) and routes everything through a single
decision-maker. This document is the map; each section links to the canonical
spec.

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
    class U neutral; class R,TM,PK think; class AG,SK neutral; class IN exec;
```

| Layer | What it is | Canonical spec |
|-------|-----------|----------------|
| User | Human requests | — |
| Claude Triage Router | Classifies + routes | [router.md](./router.md) |
| Task Management | The task board + lifecycle | [../../templates/strix/tasks/README.md](../../templates/strix/tasks/README.md) |
| Project Knowledge | Source of truth | [knowledge.md](./knowledge.md) |
| Agent Layer | 4 Claude agents | [agents.md](./agents.md) |
| Skill Layer | 20 reusable skills | [skills.md](./skills.md) |
| Infrastructure | Files, terminal, build, test | Executor runtime |

## Two Runtimes

```mermaid
flowchart LR
    subgraph Plan["Planning Runtime — Claude Thinks"]
      P[analyze · brainstorm · triage · plan · architect · break down · review · govern]
    end
    subgraph Exec["Execution Runtime — The Executor Executes"]
      E[implement · edit · build · lint · test · fix]
    end
    Plan -- "READY task + read-only knowledge" --> Exec
    Exec -- "task -> Review" --> Plan
    classDef think fill:#e8f0fe,stroke:#4285f4,color:#1a1a1a;
    classDef exec fill:#fde8e8,stroke:#ea4335,color:#1a1a1a;
    class P think; class E exec;
```

Canonical: [../workflow/runtime-separation.md](../workflow/runtime-separation.md).

## Design Principles

Task-Driven · Hybrid · Layered · Router-Based · Skill-First · Knowledge-Driven ·
Claude Thinks · The Executor Executes · Minimize context · Prevent over-engineering ·
Long-term maintainability. Full list:
[../workflow/README.md](../workflow/README.md).

## Engine-Agnostic Core

Components never hard-code engine names; they resolve capabilities through the
[capability matrix](../workflow/capability-matrix.md). Adding an engine is a data
edit — see [Quality Requirements](#quality-requirements).

## Quality Requirements

Modular · easy to extend · no duplicated responsibilities · reasoning separated
from execution · small prompts · reusable context · optimized tokens · supports
future engines. Each is realized by a specific mechanism documented in
[governance.md](./governance.md) and the capability matrix.
