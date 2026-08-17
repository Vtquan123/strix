# Capability Matrix

The Router **must not** hard-code engine names. Instead it consults this matrix:
every capability maps to the engine(s) allowed to perform it. Adding a future
engine means adding a column here — not editing the Router.

## Matrix

<!-- strix:gen start id=capability-legend -->
Legend: ✅ owns · 🚫 forbidden · 📖 read-only
<!-- strix:gen end id=capability-legend -->

<!-- strix:gen start id=capability-matrix -->
| Capability | Claude | Executor | Layer |
| ------------ | :------: | :------: | ------- |
| Requirement analysis | ✅ | 🚫 | Router / Planning |
| Brainstorming | ✅ | 🚫 | Planning |
| Triage / classification | ✅ | 🚫 | Router |
| Planning | ✅ | 🚫 | Planning |
| Architecture design | ✅ | 🚫 | Planning |
| Task creation / breakdown | ✅ | 🚫 | Task Management |
| Dependency generation | ✅ | 🚫 | Task Management |
| Review / approval | ✅ | 🚫 | Planning |
| Risk analysis | ✅ | 🚫 | Planning |
| Project scan / onboarding | ✅ | 🚫 | Knowledge |
| Knowledge read | ✅ | 📖 | Knowledge |
| Knowledge write | ✅ | 🚫 | Knowledge |
| ADR authoring | ✅ | 🚫 | Knowledge |
| Convention definition | ✅ | 🚫 | Knowledge |
| Implement / edit source | 🚫 | ✅ | Infrastructure |
| Refactor | 🚫 | ✅ | Infrastructure |
| Run terminal | ✅ | ✅ | Shared |
| Build | 🚫 | ✅ | Infrastructure |
| Lint | 🚫 | ✅ | Infrastructure |
| Test | 🚫 | ✅ | Infrastructure |
| Fix failures | 🚫 | ✅ | Infrastructure |
<!-- strix:gen end id=capability-matrix -->

## Engines

<!-- strix:gen start id=engines-table -->
| Engine | Runtime | Kind |
| -------- | --------- | ------ |
| `claude` | planning | reasoning |
| `executor` | execution | implementation |
<!-- strix:gen end id=engines-table -->

## Machine-Readable Form

There is no second copy of the matrix in this file. The table above is
**generated** from [`config/capabilities.yaml`](../../config/capabilities.yaml),
which is the single source of truth the Router reads. Edit that file and run
`npm run gen`; never hand-edit inside a `strix:gen` region.

Adding a future engine means adding an entry to `engines:` and one `access:` key
per capability — the Router needs no code change.

## How The Router Uses It

1. Router detects the **capability** a request or task step needs.
2. Router looks up the capability's `owners`.
3. Router dispatches to an available engine in `owners`, respecting `mode`.

Because the Router keys off capabilities, swapping one executor for another —
or adding a second reasoning engine — is a data edit, satisfying the principle
*"Support future engines beyond Claude and Cline."*
