---
name: architecture
description: Design or evolve system structure and keep architecture.md diagrams true to reality, pairing significant choices with an ADR. Use when the Router routes STANDARD/EPIC work that introduces or changes modules, boundaries, or cross-cutting concerns.
metadata:
  kind: reasoning
  engine: claude
---

# Architecture

## Purpose
Design or evolve system structure and keep `architecture.md` diagrams true to
reality, pairing significant choices with an ADR.

## When to use
The Router selects this for STANDARD/EPIC work that introduces or changes
modules, boundaries, or cross-cutting concerns.

## Inputs / Outputs
- **In:** requirement, current `architecture.md`, constraints.
- **Out:** updated diagrams, component map, and (if significant) an ADR.

## Procedure
1. State the structural problem and constraints.
2. Sketch 2-3 options; compare trade-offs.
3. Choose the simplest option that fits.
4. Update `architecture.md` diagrams + component map.
5. If significant, write an ADR via the `adr` skill.

_No terminal commands — reasoning only._

## Rules
**Do**
- Prefer the simplest structure that meets the requirement.
- Keep diagrams in `architecture.md` synchronized with reality.
- Pair significant/irreversible decisions with an ADR.

**Don't**
- Don't design for imagined future scale (over-engineering).
- Don't change architecture inside an execution task — that is a Claude decision.
- Don't leave a decision undocumented.

## Checklist
- [ ] Problem + constraints stated
- [ ] Options compared with trade-offs
- [ ] Simplest fitting option chosen
- [ ] architecture.md diagrams updated
- [ ] ADR written if decision is significant
- [ ] No speculative generality introduced

## Examples
### Introduce a caching layer
Add a cache between service and data-access. Update the component map; record an
ADR capturing the invalidation strategy and rejected alternatives.

### Diagram sync
After a module split, update the Mermaid `flowchart` in `architecture.md` the
same session; a stale diagram is a defect.

## Related
[adr](../adr/SKILL.md) · [risk-analysis](../risk-analysis/SKILL.md) · [planning](../planning/SKILL.md)
