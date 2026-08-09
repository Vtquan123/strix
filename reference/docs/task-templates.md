# Task Templates

The task is the only unit of work Cline accepts. Claude authors it; Cline builds
exactly what it says. Canonical template:
[../../templates/strix/tasks/TEMPLATE.md](../../templates/strix/tasks/TEMPLATE.md).

## Required Fields

Every task **must** contain the following, generated from
[`config/task-schema.yaml`](../../config/task-schema.yaml) — edit there, then run
`npm run gen`.

<!-- strix:gen start id=task-fields -->
| Field | Meaning |
| ------- | --------- |
| ID | Unique, sequential (`TASK-<n>`) |
| Title | Short imperative summary |
| Priority | P0–P3 |
| Complexity | TRIVIAL / SIMPLE / STANDARD / EPIC |
| Status | Queued / In Progress / In Review / Done / Archived |
| Goal | The outcome in one sentence |
| Background | Why it exists; links to knowledge |
| Requirements | Concrete, testable requirements |
| Out of Scope | What it explicitly does not do (binding) |
| Dependencies | Tasks that must be Done first |
| Suggested Skills | Skills the Router selected |
| Estimated Files | Files expected to change |
| Acceptance Criteria | Observable done-conditions |
| Definition of Ready | Gate to enter Active |
| Definition of Done | Gate to enter Review |
<!-- strix:gen end id=task-fields -->

## Markdown Template

See [../../templates/strix/tasks/TEMPLATE.md](../../templates/strix/tasks/TEMPLATE.md) for the copy-paste template and
[../examples/TASK-000-example.md](../examples/TASK-000-example.md) for a
fully worked STANDARD task.

## Lifecycle

Queue → Active → Review → Done → Archive, one directory per stage.
Canonical: [../workflow/task-lifecycle.md](../workflow/task-lifecycle.md).

## Rules of Thumb

- **STANDARD is the atomic unit** Cline executes. Everything larger decomposes.
- **Out of Scope + Estimated Files** are the guardrails against over-engineering.
- **DoR** must be satisfiable before a task leaves Queue; **DoD** before it
  leaves Active.
- The `Status` field must match the task's directory.
