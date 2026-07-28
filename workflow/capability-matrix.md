# Capability Matrix

The Router **must not** hard-code engine names. Instead it consults this matrix:
every capability maps to the engine(s) allowed to perform it. Adding a future
engine means adding a column here — not editing the Router.

## Matrix

Legend: ✅ owns · 🚫 forbidden · 📖 read-only

| Capability | Claude | Cline | Layer |
|------------|:------:|:-----:|-------|
| Requirement analysis | ✅ | 🚫 | Router / Planning |
| Brainstorming | ✅ | 🚫 | Planning |
| Triage / classification | ✅ | 🚫 | Router |
| Planning | ✅ | 🚫 | Planning |
| Architecture design | ✅ | 🚫 | Planning |
| Task creation / breakdown | ✅ | 🚫 | Task Management |
| Dependency generation | ✅ | 🚫 | Task Management |
| Review / approval | ✅ | 🚫 | Planning |
| Risk analysis | ✅ | 🚫 | Planning |
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

## Machine-Readable Form

The Router loads this table as data. A reference encoding:

```yaml
capabilities:
  requirement_analysis:   { owners: [claude], mode: exclusive }
  brainstorming:          { owners: [claude], mode: exclusive }
  triage:                 { owners: [claude], mode: exclusive }
  planning:               { owners: [claude], mode: exclusive }
  architecture:           { owners: [claude], mode: exclusive }
  task_breakdown:         { owners: [claude], mode: exclusive }
  dependency_generation:  { owners: [claude], mode: exclusive }
  review:                 { owners: [claude], mode: exclusive }
  risk_analysis:          { owners: [claude], mode: exclusive }
  knowledge_read:         { owners: [claude, cline], mode: shared, cline: read_only }
  knowledge_write:        { owners: [claude], mode: exclusive }
  adr_authoring:          { owners: [claude], mode: exclusive }
  convention_definition:  { owners: [claude], mode: exclusive }
  implement:              { owners: [cline], mode: exclusive }
  refactor:               { owners: [cline], mode: exclusive }
  run_terminal:           { owners: [claude, cline], mode: shared, claude: on_demand_confirm }
  build:                  { owners: [cline], mode: exclusive }
  lint:                   { owners: [cline], mode: exclusive }
  test:                   { owners: [cline], mode: exclusive }
  fix:                    { owners: [cline], mode: exclusive }

engines:
  claude: { runtime: planning, kind: reasoning }
  cline:  { runtime: execution, kind: implementation }
  # future engines are added here; the Router needs no code change.
```

## How The Router Uses It

1. Router detects the **capability** a request or task step needs.
2. Router looks up the capability's `owners`.
3. Router dispatches to an available engine in `owners`, respecting `mode`.

Because the Router keys off capabilities, swapping Cline for another executor —
or adding a second reasoning engine — is a data edit, satisfying the principle
*"Support future engines beyond Claude and Cline."*
