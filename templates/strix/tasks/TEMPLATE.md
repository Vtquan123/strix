# <PREFIX>-<ID>: <Title>

<!--
The task is the only unit of work the executor accepts. Claude authors it; the executor
executes only what is written here. Every section below is required (a lite task
has only the sections it keeps). Do not leave Acceptance Criteria, Out of Scope,
or Definition of Done blank.

Do not copy this file by hand — run `.strix/bin/strix-task new <workstream>
--title "..."`, which allocates the ID, files it under the right workstream, and
fills the header for you. For a TRIVIAL change, add `--lite` to get only Goal,
Estimated Files, Acceptance Criteria, Execution Report, and History.

`.strix/bin/strix-task move` enforces the gates: every <placeholder> below must be
replaced and every Definition of Ready box ticked before the task can go Active,
and the Execution Report must be filled before it can go to Review.
-->

<!-- strix:gen start id=task-header-table -->
| Field | Value |
| ------- | ------- |
| **ID** | <PREFIX>-<ID> |
| **Workstream** | <workstream-id> |
| **Title** | <short imperative title> |
| **Priority** | P0 \| P1 \| P2 \| P3 |
| **Complexity** | TRIVIAL \| SIMPLE \| STANDARD \| EPIC |
| **Status** | Queued \| In Progress \| In Review \| Done \| Archived |
| **Base** | <set on the move to active> |
<!-- strix:gen end id=task-header-table -->

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

- <Task ID that must be Done first, e.g. BILL-011, or "none">

## Suggested Skills

- <executor implementation skills: react, node, typescript, sql, testing, …>
- <Claude reasoning skills if planning is embedded: architecture, adr, …>

## Estimated Files

- `<path/to/file>` — <created \| modified>
- <…>

## Acceptance Criteria

- [ ] <Observable, verifiable condition that must hold when done>
- [ ] <…>

## Definition of Ready (DoR)

- [ ] Goal and Requirements are unambiguous
- [ ] Dependencies are listed (task IDs, or "none")
- [ ] Suggested Skills and Estimated Files are set
- [ ] Acceptance Criteria are testable

## Definition of Done (DoD)

<!-- Not ticked by hand: the executor may not edit this file. It attests each
item in the Execution Report, and the reviewer verifies them. -->

- [ ] All Acceptance Criteria met
- [ ] Build passes
- [ ] Lint passes
- [ ] Tests pass (new tests added where required)
- [ ] No Out-of-Scope work introduced
- [ ] Changes committed, each commit carrying a `Strix-Task:` trailer with this task's ID
- [ ] Execution Report filled
- [ ] Knowledge/ADR updated **if** a governance trigger fired (else noted "n/a")

## Execution Report

<!-- The executor fills this before moving to Review, with
`.strix/bin/strix-task note <ID> --section "Execution Report" --text "..."`:
each command run with its exit code and the tail of its output, and the SHAs of
the commits that carry the `Strix-Task: <ID>` trailer. -->

## Review Checklist

<!-- Empty unless the reviewer requests changes, which it records with
`.strix/bin/strix-task note <ID> --section "Review Checklist" --text "..."`,
one required change per item. -->

## History

<!-- Appended by strix-task on every move: time, from → to, actor, reason.
Never edit by hand. -->

---
*Complexity levels and lifecycle are documented in the Strix plugin under
`reference/workflow/` (`complexity-levels.md`, `task-lifecycle.md`).*
