# Router

The Router is the single decision-maker in Strix. It sits at Layer 2 (Claude
Triage Router) and runs on Claude. **The Router always decides. Agents never
self-select.** No agent picks its own skills, context, or successor — it
receives them from the Router.

```mermaid
flowchart TD
    REQ[User request] --> R1[1. Intent Detection]
    R1 --> R2[2. Complexity Detection]
    R2 --> R3[3. Skill Selection]
    R3 --> R4[4. Context Selection]
    R4 --> R5[5. Agent Selection]
    R5 --> DISP[Dispatch]
    DISP --> CAP{{Capability Matrix}}
    CAP -.consulted by.-> R3
    CAP -.consulted by.-> R5
    classDef think fill:#e8f0fe,stroke:#4285f4,color:#1a1a1a;
    class R1,R2,R3,R4,R5 think;
```

## The Five Router Functions

### 1. Intent Detection
Classify what the user actually wants. Intent drives which agent and which executor
workflow will ultimately run. Intents and complexity levels are generated from
[`config/routing.yaml`](../../config/routing.yaml).

<!-- strix:gen start id=intents-table -->
| Intent | Means |
| -------- | ------- |
| `feature` | new behaviour |
| `fix` | bug fix |
| `refactor` | restructure without behaviour change |
| `question` | needs an answer, may need no task |
| `arch` | architecture or structural decision |
| `knowledge` | knowledge layer or documentation work |
| `review` | verify completed work against criteria |
| `skill-install` | add, update, or remove a skill |
| `onboarding` | first-time scan of an existing codebase to populate the knowledge layer |
<!-- strix:gen end id=intents-table -->

### 2. Complexity Detection
Classify the request into exactly one level (see
[complexity-levels.md](./complexity-levels.md)). An EPIC is decomposed before
anything else proceeds.

<!-- strix:gen start id=complexity-inline -->
`TRIVIAL` · `SIMPLE` · `STANDARD` · `EPIC`
<!-- strix:gen end id=complexity-inline -->

### 3. Skill Selection
Choose the minimal set of skills the work needs — reasoning skills for Claude,
implementation skills for the executor — and record them in the task's
`Suggested Skills`. Selection is driven by intent + complexity, validated
against the [capability matrix](./capability-matrix.md). Skill-First Design:
the skill carries the how-to so the prompt stays small.

### 4. Context Selection
Choose the **minimal knowledge** to load: only the `knowledge/*` files and task
fields relevant to this request. Minimising context is a first-class goal —
never load the whole knowledge base "just in case".

### 5. Agent Selection
Pick the Claude agent or the executor workflow (`implement`, `fix`, `refactor`,
`testing`, `review-fixes`) that will run — chosen via the capability matrix, not
hard-coded engine names. The Claude agents:

<!-- strix:gen start id=agents-inline -->
`triage-agent` (classify + route) · `task-creator-agent` (author tasks, decompose EPICs) · `reviewer-agent` (gate Review → Done) · `knowledge-agent` (govern the knowledge layer)
<!-- strix:gen end id=agents-inline -->

## Capability-Driven Dispatch

The Router never says "send to the executor". It says "this step needs the `implement`
capability → the matrix says `executor` owns it → dispatch there." This indirection
is what lets Strix add future engines without touching Router logic.

```mermaid
flowchart LR
    STEP[Work step] --> NEED[Needed capability]
    NEED --> LOOK[Look up owners in matrix]
    LOOK --> PICK[Pick available owner]
    PICK --> GO[Dispatch]
```

## Router Decision Record (per request)

The Router emits a small, explicit decision object so routing is auditable:

<!-- strix:gen start id=decision-record -->
```yaml
intent: feature
complexity: STANDARD
skills: [architecture, task-breakdown]
context: [project-context.md, coding-conventions.md]
agent: task-creator-agent
capability: task_breakdown
```
<!-- strix:gen end id=decision-record -->

`intent`, `complexity`, `skills`, and `capability` are drawn from the enumerations
above and from [capability-matrix.md](./capability-matrix.md).

## Invariants

- The Router runs **before** any agent or workflow.
- Agents receive skills + context; they do **not** choose them.
- EPIC never dispatches to execution.
- Every dispatch resolves through the capability matrix.

Full narrative documentation lives in [../docs/router.md](../docs/router.md).
