---
name: risk-analysis
description: Surface security, data, and blast-radius risks in a plan, task, or change, and turn them into mitigations or Out-of-Scope boundaries. Use when the Router routes planning, task creation, or review of higher-risk work; escalate irreversible risks to an ADR.
metadata:
  kind: reasoning
  engine: claude
---

# Risk Analysis

## Purpose
Surface security, data, and blast-radius risks in a plan, task, or change, and
turn them into mitigations or Out-of-Scope boundaries.

## When to use
The Router selects this during planning, task creation, and review of
higher-risk work.

## Inputs / Outputs
- **In:** plan/task/diff, `coding-conventions.md` (security), architecture.
- **Out:** ranked risks with mitigations; items for Out of Scope / dependencies.

## Procedure
1. Enumerate what could go wrong (security, data, availability, scope).
2. Rank by likelihood x impact.
3. For each top risk, define a mitigation or boundary.
4. Feed mitigations into Acceptance Criteria / Out of Scope.
5. Flag irreversible risks for an ADR.

_No terminal commands — reasoning only._

## Rules
**Do**
- Rank risks by likelihood x impact.
- Convert each real risk into a mitigation, test, or scope boundary.
- Escalate irreversible risks to an ADR.

**Don't**
- Don't hand-wave ("should be fine") — state the concrete failure.
- Don't block on negligible risks (over-engineering the process).

## Checklist
- [ ] Failure modes enumerated
- [ ] Ranked by likelihood x impact
- [ ] Each top risk has a mitigation
- [ ] Mitigations mapped to criteria/scope
- [ ] Irreversible risks flagged for ADR

## Examples
### Auth change
A login change touches session handling. Risks: fixation, timing. Mitigation:
rotate session on login; add tests. Feed both into Acceptance Criteria.

### Migration
A schema migration is irreversible. Risk: data loss. Mitigation: backfill +
reversible steps; record an ADR.

## Related
[review](../review/SKILL.md) · [architecture](../architecture/SKILL.md) · [adr](../adr/SKILL.md)
