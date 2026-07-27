# Skill Layer

Skills carry the reusable *how-to* so prompts stay small (Skill-First Design).
A skill is selected by the Router and named in a task's `Suggested Skills`; an
agent or workflow never self-selects.

## Two Kinds

| Kind | Engine | Directory | Purpose |
|------|--------|-----------|---------|
| **Reasoning** | Claude | [`.claude/skills/`](../../.claude/skills/) | How to think: plan, design, review, govern |
| **Implementation** | Cline | [`.cline/skills/`](./) | How to build: code, test, ship |

## Every Skill Has Five Files

Each skill directory contains exactly:

| File | Contents |
|------|----------|
| `skill.md` | Overview: purpose, when to use, inputs/outputs, related skills |
| `examples.md` | Worked examples showing the skill applied |
| `rules.md` | Do / Don't — the guardrails |
| `commands.md` | Reasoning skills: the step procedure. Implementation skills: real CLI commands |
| `checklist.md` | Pre-flight / done checklist to self-verify |

This uniform shape makes skills modular, comparable, and easy to extend — add a
new skill by copying the five-file structure.

## Reasoning Skills (Claude)

`planning` · `architecture` · `brainstorming` · `review` · `documentation` ·
`risk-analysis` · `task-breakdown` · `ADR` · `knowledge-update` ·
`cline-skill-handler`

## Implementation Skills (Cline)

`react` · `nextjs` · `node` · `typescript` · `sql` · `testing` · `debugging` ·
`git` · `performance`

## Extending

1. Pick the kind (reasoning → `.claude/skills/`, implementation → `.cline/skills/`).
2. Create `.claude/skills/<name>/` or `.cline/skills/<name>/` with the five files.
3. Reference it from the Router's [routing rules](../../.claude/rules/routing.md) so
   it can be selected.

> Reasoning skills never execute; implementation skills never redesign. The
> [capability matrix](../../workflow/capability-matrix.md) keeps the line firm.
