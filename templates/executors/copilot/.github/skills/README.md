# Strix Executor Skills (GitHub Copilot)

Skills carry the reusable *how-to* so prompts stay small (Skill-First Design).
A skill is selected by the Router and named in a task's `Suggested Skills`; the
executor never self-selects.

These are the **implementation skills** for the Copilot executor. Because Copilot
has no dedicated skills directory of its own, Strix keeps them here and surfaces
them as reusable content the workflow prompts point at. They follow the open
[Agent Skills format](https://agentskills.io/specification) (one `SKILL.md`,
`name` + `description` frontmatter).

## Implementation Skills

_None yet._ Add one with the `skill-manager` skill (it installs into this
project's active executor's skills directory, resolved from `.strix/config.yaml`).
