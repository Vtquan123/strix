# Task Templates

The task is the only unit of work the executor accepts. Claude authors it; the executor builds
exactly what it says. Canonical template:
[../../templates/strix/tasks/TEMPLATE.md](../../templates/strix/tasks/TEMPLATE.md).

## Required Fields

Every task **must** contain the following, generated from
[`config/task-schema.yaml`](../../config/task-schema.yaml) — edit there, then run
`npm run gen`.

<!-- strix:gen start id=task-fields -->
| Field | Meaning |
| ------- | --------- |
| ID | `<PREFIX>-<n>`, sequential within its workstream |
| Workstream | The workstream folder this task lives in |
| Title | Short imperative summary |
| Priority | P0–P3 |
| Complexity | TRIVIAL / SIMPLE / STANDARD / EPIC |
| Status | Queued / In Progress / In Review / Done / Archived |
| Base | The commit the task started from, recorded by `strix-task move <ID> active`; the reviewer diffs from it |
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
| Execution Report | Commands run, exit codes, output tail, and the `Strix-Task:` commits; required to enter Review |
| Review Checklist | Each change the reviewer requires; required to return a task to Active |
| History | Every move, with time, actor, and reason |
<!-- strix:gen end id=task-fields -->

## Markdown Template

See [../../templates/strix/tasks/TEMPLATE.md](../../templates/strix/tasks/TEMPLATE.md) for the copy-paste template and
[../examples/TASK-000-example.md](../examples/TASK-000-example.md) for a
fully worked STANDARD task.

## Lifecycle

Queue → Active → Review → Done → Archive, one directory per stage.
Canonical: [../workflow/task-lifecycle.md](../workflow/task-lifecycle.md).

## Rules of Thumb

- **STANDARD is the atomic unit** the executor executes. Everything larger decomposes.
- **Out of Scope + Estimated Files** are the guardrails against over-engineering.
- **TRIVIAL work uses a lite task** (`strix-task new --lite`): Goal, Estimated
  Files, Acceptance Criteria, Execution Report, and History only.
- **The gates are enforced by `strix-task move`:** no placeholders and a ticked
  DoR to leave Queue; a filled Execution Report to leave Active; a Review
  Checklist to go back from Review to Active.
- **Execution Report and Review Checklist are written with `strix-task note`,**
  and History only by `strix-task` itself. Base is recorded on the first move to
  Active.
- The `Status` field must match the task's stage directory, and the `Workstream`
  field its parent directory. `strix-task doctor` checks these alongside IDs,
  dependencies, placeholders, Base, and reports; see
  [../workflow/task-lifecycle.md](../workflow/task-lifecycle.md).
