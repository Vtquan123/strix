---
name: brainstorming
description: Explore intent, requirements, and design options before committing to a plan, surfacing unknowns and trade-offs early. Use when the Router routes an ambiguous or STANDARD/EPIC request at its start, before the planning skill.
metadata:
  kind: reasoning
  engine: claude
---

# Brainstorming

## Purpose
Explore intent, requirements, and design options before committing to a plan —
surface unknowns and trade-offs early.

## When to use
The Router selects this at the start of ambiguous or STANDARD/EPIC requests,
before `planning`.

## Inputs / Outputs
- **In:** raw request, `project-context.md`.
- **Out:** clarified intent, option set with trade-offs, open questions.

## Procedure
1. Mirror back the request in your own words.
2. List ambiguities; ask only the blocking questions.
3. Generate 2-3 distinct approaches.
4. Compare on cost, risk, and fit.
5. Recommend one; record the rest as alternatives.

_No terminal commands — reasoning only._

## Rules
**Do**
- Ask the smallest set of questions that removes ambiguity.
- Offer options with explicit trade-offs, then recommend one.
- Capture open questions for risk-analysis or the task Background.

**Don't**
- Don't jump to implementation.
- Don't produce tasks here — that is `task-creator-agent`.
- Don't expand scope beyond the user's intent.

## Checklist
- [ ] Intent mirrored back and confirmed
- [ ] Blocking ambiguities resolved
- [ ] 2-3 options generated
- [ ] Trade-offs made explicit
- [ ] One option recommended
- [ ] Open questions captured

## Examples
### "Add notifications"
Clarify: which channels? which events? real-time or digest? Surface 3 options
(in-app only / email / push) with cost + complexity trade-offs before planning.

### Narrowing scope
User says "make it faster". Brainstorm turns it into measurable targets and a
short list of candidate bottlenecks to investigate.

## Related
[planning](../planning/SKILL.md) · [risk-analysis](../risk-analysis/SKILL.md) · [architecture](../architecture/SKILL.md)
