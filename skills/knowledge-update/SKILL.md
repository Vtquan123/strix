---
name: knowledge-update
description: Apply the knowledge governance policy — update .strix/knowledge/* only when a real trigger fires (architecture, convention, module, business rule, EPIC completion, tech stack), keeping the source of truth coherent and drift-free. Use for the knowledge-agent after a task is approved; record "n/a" when no trigger fires.
metadata:
  kind: reasoning
  engine: claude
---

# Knowledge Update

## Purpose
Apply the knowledge governance policy: update `.strix/knowledge/*` only when a real
trigger fires, keeping the source of truth coherent and drift-free.

## When to use
The Router selects this for `knowledge-agent` after a task is approved.

## Inputs / Outputs
- **In:** approved task, reviewer verdict, current `.strix/knowledge/*`.
- **Out:** minimal, accurate knowledge/ADR updates — or an explicit "no update".

## Procedure
1. Check the change against the trigger list.
2. If no trigger → record "n/a" and stop.
3. If triggered → pick the owning knowledge file.
4. Apply the minimal accurate edit; add an ADR if significant.
5. Note the update in the task DoD.

_No terminal commands — reasoning + file authoring only._

## Rules
**Do**
- Update for: architecture, convention, module, business rule, EPIC completion,
  tech stack.
- Make the smallest change that keeps knowledge true.
- Record what changed in the task's Definition of Done.

**Don't**
- Never update for: typo, rename, CSS fix, minor bug.
- Don't let the executor write knowledge — Claude only.
- Don't add speculative documentation.

## Checklist
- [ ] Change checked against trigger list
- [ ] "n/a" recorded if no trigger
- [ ] Owning file updated minimally + accurately
- [ ] ADR added if decision significant
- [ ] architecture.md diagrams still true
- [ ] Update noted in task DoD

## Examples
### New module → update
A caching module ships. Update Current Modules + architecture.md; add ADR.

### Typo → no update
The executor fixed a typo in a label. No knowledge trigger; record "n/a" in the task
DoD.

## Related
[documentation](../documentation/SKILL.md) · [adr](../adr/SKILL.md) · [architecture](../architecture/SKILL.md)
