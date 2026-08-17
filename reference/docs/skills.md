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
| Implementation (project) | active executor | the project's active-executor skills dir | seeded by `/strix:init`; added via `skill-manager` |

The implementation location depends on which executor the project selected at
init (recorded in `.strix/config.yaml`, catalogued in
[`config/executors.yaml`](../../config/executors.yaml)): `.clinerules/skills/`
for Cline, `.github/skills/` for Copilot, `.strix/executor/skills/` for Claude.

The table under **Reasoning Skills (Claude)** below catalogs the **built-in**
plugin skills only. A project's own `.claude/skills/` and its active-executor
skills dir are catalogued in that project (Claude Code auto-discovers
`.claude/skills/`; implementation skills are listed in the executor's catalog,
e.g. `.clinerules/skills/README.md`).

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

**Implementation skills** (active executor) — single file under the executor's
skills dir, `<skills_dir>/<name>/SKILL.md`:

```yaml
---
name: skill-name
description: One sentence — when the executor should activate this skill.
---
```

The `description` field drives progressive loading. Optional subdirs: `docs/`, `templates/`, `scripts/`.

## Reasoning Skills (Claude)

Generated from [`config/skills.yaml`](../../config/skills.yaml), which the
validator asserts matches the [`skills/`](../../skills/) directories exactly.

<!-- strix:gen start id=skills-table -->
| Skill | Role |
| ------- | ------ |
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
| skill-manager | Install/update/remove skills.sh skills into the project's `.claude/skills/` (reasoning) or the active executor's skills directory |
| strix-init | Scaffold `.strix/` and the chosen executor's config into a project |
<!-- strix:gen end id=skills-table -->

## Implementation Skills (active executor)

_None yet._ Add one with the `skill-manager` skill; it installs into the active
executor's skills dir (resolved from `.strix/config.yaml`).

## Extending

Adding skills to a **consuming project** (the common case):

- **Reasoning skill** → use the `skill-manager` skill to install one from the
  [skills.sh](https://www.skills.sh) registry into the project's `.claude/skills/`,
  or hand-author `<project>/.claude/skills/<name>/SKILL.md` with `name` + `description`.
  Claude Code auto-discovers it; no catalog to maintain.
- **Implementation skill** → use the `skill-manager` skill to install one from the
  registry into the active executor's skills dir (`.clinerules/skills/` for Cline,
  `.github/skills/` for Copilot, `.strix/executor/skills/` for Claude), or
  hand-author one there; `skill-manager` keeps the executor's catalog in sync.

Changing Strix's **built-in** reasoning skills (the table above) is Strix-plugin
development done in the plugin repo itself — create `skills/<name>/SKILL.md` and
reference it from [../rules/routing.md](../rules/routing.md). The project-scoped
`skill-manager` skill never touches these built-ins.
