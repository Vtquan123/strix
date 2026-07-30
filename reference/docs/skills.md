# Skills

Skills carry reusable know-how so prompts stay small (Skill-First Design). The
Router selects them; they are recorded in a task's `Suggested Skills`.

## Two Kinds, three locations

Skills come in two **kinds** (reasoning vs implementation) and live in one of
three **locations** depending on whether they ship with Strix or belong to a
consuming project:

| Kind | Engine | Location | Who owns it |
|------|--------|----------|-------------|
| Reasoning (built-in) | Claude | plugin [`skills/`](../../skills/), invoked `strix:<name>` | ships with Strix; read-only |
| Reasoning (project) | Claude | the project's `.claude/skills/`, invoked `<name>` | added per project via `skill-manager` |
| Implementation (project) | Cline | the project's `.clinerules/skills/` | seeded by `/strix:init`; added via `cline-skill-handler` or `skill-manager` |

The table under **Reasoning Skills (Claude)** below catalogs the **built-in**
plugin skills only. A project's own `.claude/skills/` and `.clinerules/skills/`
are catalogued in that project (Claude Code auto-discovers `.claude/skills/`;
Cline skills are listed in the project's `.clinerules/skills/README.md`).

## File Contracts

Both kinds follow the open [Agent Skills format](https://agentskills.io/specification):
a single `SKILL.md` per skill, with YAML frontmatter (`name` + `description`
required) followed by the instructions. Optional subdirs (`references/`,
`scripts/`, `assets/`) load on demand via progressive disclosure.

**Reasoning skills** (Claude) — single file under `<name>/SKILL.md` (in the
plugin's `skills/` for built-ins, or a project's `.claude/skills/` for project
skills):

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

**Implementation skills** (Cline) — single file under `.clinerules/skills/<name>/SKILL.md`:

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
| skill-manager | Install/update/remove skills.sh skills into the **project's** `.claude/skills/` or `.clinerules/skills/` |

## Implementation Skills (Cline)

_None yet._ Add one with the `cline-skill-handler` Claude skill.

## Extending

Adding skills to a **consuming project** (the common case):

- **Reasoning skill** → use the `skill-manager` skill to install one from the
  [skills.sh](https://www.skills.sh) registry into the project's `.claude/skills/`,
  or hand-author `<project>/.claude/skills/<name>/SKILL.md` with `name` + `description`.
  Claude Code auto-discovers it; no catalog to maintain.
- **Implementation skill** → use the `cline-skill-handler` skill to author one into
  the project's `.clinerules/skills/`, or `skill-manager` to install one from the
  registry; both update the project's `.clinerules/skills/README.md`.

Changing Strix's **built-in** reasoning skills (the table above) is Strix-plugin
development done in the plugin repo itself — create `skills/<name>/SKILL.md` and
reference it from [../rules/routing.md](../rules/routing.md). The project-scoped
`skill-manager`/`cline-skill-handler` skills never touch these built-ins.
