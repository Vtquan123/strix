# Skill Layer

Skills carry the reusable *how-to* so prompts stay small (Skill-First Design).
A skill is selected by the Router and named in a task's `Suggested Skills`; an
agent or workflow never self-selects.

## Two Kinds

| Kind | Engine | Directory | Purpose |
|------|--------|-----------|---------|
| **Reasoning** | Claude | [`.claude/skills/`](../../.claude/skills/) | How to think: plan, design, review, govern |
| **Implementation** | Cline | [`.clinerules/skills/`](./) | How to build: code, test, ship |

## Every Skill Is One `SKILL.md`

Skills follow the open [Agent Skills format](https://agentskills.io/specification):
one `SKILL.md` per skill directory, with YAML frontmatter followed by instructions.

```yaml
---
name: skill-name          # lowercase-hyphen; must match the folder name
description: What the skill does and when to activate it.
---
```

The body carries the purpose, when-to-use, procedure, rules, checklist, and
examples. Optional subdirs (`references/`/`docs/`, `templates/`, `scripts/`) load
on demand via progressive disclosure. This uniform shape makes skills modular,
comparable, and easy to extend — add a new skill by copying the `SKILL.md` shape.

## Reasoning Skills (Claude)

`planning` · `architecture` · `brainstorming` · `review` · `documentation` ·
`risk-analysis` · `task-breakdown` · `adr` · `project-scan` ·
`knowledge-update` · `cline-skill-handler` · `skill-manager`

## Implementation Skills (Cline)

_None yet._ Add one with the `cline-skill-handler` Claude skill.

## Extending

1. Pick the kind (reasoning → `.claude/skills/`, implementation → `.clinerules/skills/`).
2. Create `.claude/skills/<name>/SKILL.md` or `.clinerules/skills/<name>/SKILL.md`.
3. Reference it from the Router's [routing rules](../../.claude/rules/routing.md) so
   it can be selected.

> Reasoning skills never execute; implementation skills never redesign. The
> [capability matrix](../../workflow/capability-matrix.md) keeps the line firm.
