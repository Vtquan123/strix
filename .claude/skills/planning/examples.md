# Examples: Planning

## Example 1 — Feature: user avatars
Plan:
1. TASK-A add avatar column + migration (dep: none)
2. TASK-B upload endpoint (dep: A)
3. TASK-C UI upload control (dep: B)
Each is STANDARD; C blocked until B is Done.

## Example 2 — Ordering rule
When two tasks touch the same module, sequence them to avoid merge conflict and
make the dependency explicit rather than implicit.
