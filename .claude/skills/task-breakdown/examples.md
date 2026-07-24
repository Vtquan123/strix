# Examples: Task Breakdown

## Example 1 — EPIC: billing
Split into: schema, payment-provider adapter, checkout endpoint, invoice UI,
webhooks. Each STANDARD; webhooks depend on the adapter.

## Example 2 — Dependency graph
Draw edges so independent tasks (schema, UI shell) can run in parallel while
dependent ones wait.
