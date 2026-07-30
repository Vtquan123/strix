# TASK-<ID>: <Title>

<!--
The task is the only unit of work Cline accepts. Claude authors it; Cline
executes only what is written here. Every field is required. Do not leave
Acceptance Criteria, Out of Scope, or Definition of Done blank.
-->

| Field | Value |
|-------|-------|
| **ID** | TASK-<ID> |
| **Title** | <short imperative title> |
| **Priority** | P0 \| P1 \| P2 \| P3 |
| **Complexity** | TRIVIAL \| SIMPLE \| STANDARD \| EPIC |
| **Status** | Queued \| In Progress \| In Review \| Done \| Archived |

## Goal

<One sentence: the outcome this task delivers.>

## Background

<Why this task exists. Link relevant knowledge: project-context, architecture,
ADRs, glossary terms.>

## Requirements

- [ ] <Concrete, testable requirement>
- [ ] <…>

## Out of Scope

- <What this task explicitly does NOT do. Binding — anything here is
  over-engineering if implemented.>

## Dependencies

- <TASK-<ID> that must be Done first, or "none">

## Suggested Skills

- <Cline implementation skills: react, node, typescript, sql, testing, …>
- <Claude reasoning skills if planning is embedded: architecture, ADR, …>

## Estimated Files

- `<path/to/file>` — <created \| modified>
- <…>

## Acceptance Criteria

- [ ] <Observable, verifiable condition that must hold when done>
- [ ] <…>

## Definition of Ready (DoR)

- [ ] Goal and Requirements are unambiguous
- [ ] Dependencies are Done
- [ ] Suggested Skills and Estimated Files are set
- [ ] Acceptance Criteria are testable

## Definition of Done (DoD)

- [ ] All Acceptance Criteria met
- [ ] Build passes
- [ ] Lint passes
- [ ] Tests pass (new tests added where required)
- [ ] No Out-of-Scope work introduced
- [ ] Knowledge/ADR updated **if** a governance trigger fired (else noted "n/a")

---
*Complexity levels and lifecycle are documented in the Strix plugin under
`reference/workflow/` (`complexity-levels.md`, `task-lifecycle.md`).*
