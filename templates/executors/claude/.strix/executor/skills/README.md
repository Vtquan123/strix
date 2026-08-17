# Executor Skill Layer

Skills carry the reusable *how-to* so prompts stay small (Skill-First Design).
A skill is selected by the Router and named in a task's `Suggested Skills`; the
executor never self-selects.

These are the **implementation skills** for the isolated Claude executor. They
live here — `.strix/executor/skills/` — deliberately **separate** from the
orchestrator's project reasoning skills in `.claude/skills/`, so the two runtimes
never blend.

## Every Skill Is One `SKILL.md`

Skills follow the open [Agent Skills format](https://agentskills.io/specification):
one `SKILL.md` per skill directory, with YAML frontmatter followed by
instructions. Implementation skills use only `name` + `description` (no Strix
`kind`/`engine` metadata).

```yaml
---
name: skill-name          # lowercase-hyphen; must match the folder name
description: What the skill does and when to activate it.
---
```

Optional subdirs (`references/`/`docs/`, `templates/`, `scripts/`) load on demand
via progressive disclosure.

## Implementation Skills

_None yet._ Add one with the `skill-manager` skill (it installs into this
project's active executor's skills directory, resolved from `.strix/config.yaml`).
