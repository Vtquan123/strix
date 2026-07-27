---
name: sql
description: Use when a task involves database queries, schema changes, or migrations.
---

# SQL

Write correct, safe queries and reversible migrations that match the project's schema conventions.

## When To Use
Task's Suggested Skills include `sql` (schema, queries, migrations).

## Inputs / Outputs
- **In:** task Requirements, schema in architecture, conventions.
- **Out:** migrations + queries + tests, green build.

## Rules

**Do**
- Make migrations reversible; provide down steps.
- Parameterize every query.
- Add indexes the task's access pattern needs.

**Don't**
- Don't concatenate user input into SQL (injection).
- Don't run irreversible/destructive migrations without an ADR.
- Don't over-index speculatively.

## Commands

```bash
npm run migrate         # apply migrations (project tool)
npm run migrate:down    # roll back last migration
npm run db:seed         # seed data (if applicable)
```

Use the project's migration tool; destructive changes escalate to an ADR.

## Examples

**Reversible migration** — add a column with a default and a down-migration; backfill in a separate step to avoid locks.

**Parameterized query** — always bind parameters; never string-concatenate user input into SQL.

## Checklist

- [ ] Migration reversible (down provided)
- [ ] Queries parameterized
- [ ] Needed indexes added, no speculative ones
- [ ] Backfill separated from schema change
- [ ] Tests cover query behaviour
- [ ] Destructive change gated by ADR
