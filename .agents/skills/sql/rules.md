# Rules: SQL

## Do
- Make migrations reversible; provide down steps.
- Parameterize every query.
- Add indexes the task's access pattern needs.

## Don't
- Don't concatenate user input into SQL (injection).
- Don't run irreversible/destructive migrations without an ADR.
- Don't over-index speculatively.
