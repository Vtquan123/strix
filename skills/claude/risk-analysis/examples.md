# Examples: Risk Analysis

## Example 1 — Auth change
A login change touches session handling. Risks: fixation, timing. Mitigation:
rotate session on login; add tests. Feed both into Acceptance Criteria.

## Example 2 — Migration
A schema migration is irreversible. Risk: data loss. Mitigation: backfill +
reversible steps; record an ADR.
