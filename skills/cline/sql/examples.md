# Examples: SQL

## Example 1 — Reversible migration
Add a column with a default and a down-migration; backfill in a separate step to
avoid locks.

## Example 2 — Parameterized query
Always bind parameters; never string-concatenate user input into SQL.
