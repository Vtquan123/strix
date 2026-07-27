---
name: adr
description: Author an Architecture Decision Record capturing a significant, hard-to-reverse choice — context, options, decision, and consequences — as an immutable numbered record in knowledge/decisions/. Use when the Router routes an architecture, convention, tech-stack, or business-rule decision with structural impact; not for typos, renames, CSS, or minor bugs.
metadata:
  kind: reasoning
  engine: claude
---

# ADR (Architecture Decision Record)

## Purpose
Capture significant, hard-to-reverse decisions — context, choice, options,
consequences — as immutable records in `knowledge/decisions/`.

## When to use
The Router selects this for architecture, convention, tech-stack, or
business-rule decisions with structural impact.

## Inputs / Outputs
- **In:** the decision, options considered, constraints.
- **Out:** a new numbered ADR (or a supersede of an old one).

## Procedure
1. Copy `knowledge/decisions/0000-adr-template.md`.
2. Increment the number; set a kebab title.
3. Fill Context, Decision, Options, Consequences, Compliance.
4. Set Status (Proposed → Accepted).
5. Update the ADR index in `decisions/README.md`.

_No terminal commands — reasoning + file authoring only._

## Rules
**Do**
- One decision per file; sequential numbering.
- Record options considered and consequences, not just the choice.
- Supersede, never rewrite, a decided ADR.
- Only Claude authors ADRs.

**Don't**
- Don't write an ADR for a typo/rename/CSS/minor bug.
- Don't let Cline touch ADRs (read-only for execution).
- Don't leave Status ambiguous.

## Checklist
- [ ] Copied from template, next sequential number
- [ ] Context + Decision stated clearly
- [ ] Options + consequences recorded
- [ ] Status set
- [ ] Index in decisions/README.md updated
- [ ] Supersedes old ADR instead of editing it (if applicable)

## Examples
### Choose Postgres over Mongo
Record the drivers (relational data, transactions), options, and the trade-off
accepted. Status: Accepted.

### Supersede
A later ADR replaces the caching strategy. Old ADR marked "Superseded by
ADR-0007"; its text is left intact.

## Related
[architecture](../architecture/SKILL.md) · [knowledge-update](../knowledge-update/SKILL.md)
