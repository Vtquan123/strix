---
name: documentation
description: Write and maintain clear docs and knowledge prose that is accurate, minimal, and current. Use when the Router routes knowledge or docs authoring/updating, often paired with the knowledge-update skill.
metadata:
  kind: reasoning
  engine: claude
---

# Documentation

## Purpose
Write and maintain clear docs and knowledge prose — accurate, minimal, and
current.

## When to use
The Router selects this when knowledge or docs need authoring/updating, often
paired with `knowledge-update`.

## Inputs / Outputs
- **In:** the change, existing docs/knowledge.
- **Out:** updated markdown that stays true and tight.

## Procedure
1. Identify the single fact that changed.
2. Find the one doc that owns it.
3. Make the smallest edit that keeps it true.
4. Remove any now-stale text.
5. Cross-link related knowledge.

_No terminal commands — reasoning only._

## Rules
**Do**
- Write the least text that keeps the reader correct.
- Prefer tables and diagrams over paragraphs.
- Keep docs synchronized with reality.

**Don't**
- Don't document speculative or removed behaviour.
- Don't duplicate what code or conventions already state.
- Don't write docs the executor should own — the executor writes code, not knowledge.

## Checklist
- [ ] Correct owning doc located
- [ ] Smallest accurate edit made
- [ ] Stale text removed
- [ ] No duplication of code/conventions
- [ ] Related knowledge cross-linked

## Examples
### Module note
A new module ships. Add a one-row entry to `project-context.md` Current Modules
and a link, not a page of prose.

### Trim drift
Docs describe a removed feature. Delete the stale section rather than annotate
it.

## Related
[knowledge-update](../knowledge-update/SKILL.md) · [adr](../adr/SKILL.md)
