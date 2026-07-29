# Skills

Skills carry reusable know-how so prompts stay small (Skill-First Design). The
Router selects them; they are recorded in a task's `Suggested Skills`.

## Two Kinds

| Kind | Engine | Location |
|------|--------|----------|
| Reasoning | Claude | [`.claude/skills/`](../.claude/skills/) |
| Implementation | Cline | [`.cline/skills/`](../.cline/skills/) |

## File Contracts

Both kinds follow the open [Agent Skills format](https://agentskills.io/specification):
a single `SKILL.md` per skill, with YAML frontmatter (`name` + `description`
required) followed by the instructions. Optional subdirs (`references/`,
`scripts/`, `assets/`) load on demand via progressive disclosure.

**Reasoning skills** (Claude) — single file under `.claude/skills/<name>/SKILL.md`:

```yaml
---
name: skill-name          # lowercase-hyphen; must match the folder name
description: What the skill does and when the Router should select it.
metadata:
  kind: reasoning
  engine: claude
---
```

The body merges the skill's purpose, when-to-use, procedure, rules, checklist,
and examples. Keep it under ~500 lines; move any deep reference into `references/`.

**Implementation skills** (Cline) — single file under `.cline/skills/<name>/SKILL.md`:

```yaml
---
name: skill-name
description: One sentence — when Cline should activate this skill.
---
```

The `description` field drives progressive loading. Optional subdirs: `docs/`, `templates/`, `scripts/`.

## Reasoning Skills (Claude)

| Skill | Role |
|-------|------|
| planning | Order work into STANDARD tasks |
| architecture | Design/evolve structure; keep diagrams true |
| brainstorming | Explore intent + options before planning |
| review | Verify a task against criteria + scope |
| documentation | Keep docs/knowledge accurate + minimal |
| risk-analysis | Surface + mitigate risks |
| task-breakdown | Decompose EPICs into STANDARD tasks |
| adr | Record significant decisions |
| project-scan | Scan an existing codebase to populate knowledge/* on adoption |
| knowledge-update | Apply knowledge governance |
| cline-skill-handler | Create/update/delete Cline skills + sync references |
| skill-manager | Install/update/remove skills.sh skills into `.claude` or `.cline` + sync docs |

## Implementation Skills (Cline)

_None yet._ Add one with the `cline-skill-handler` Claude skill.

## Extending

- **Reasoning skill** → create `.claude/skills/<name>/SKILL.md` with `name` + `description` frontmatter.
- **Implementation skill** → create `.cline/skills/<name>/SKILL.md` using the `cline-skill-handler` Claude skill.
- **From the [skills.sh](https://www.skills.sh) registry** → use the `skill-manager` Claude skill to search, install, update, or remove a ready-made skill into either layer.

Then reference the skill from [../.claude/rules/routing.md](../.claude/rules/routing.md).
Index: [../.cline/skills/README.md](../.cline/skills/README.md).
