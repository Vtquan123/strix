# Examples: Cline Skill Handler

## Example 1 — Create a new skill
User: "Add a `graphql` skill for Cline." → Confirm scope, write
`.cline/skills/graphql/SKILL.md` with frontmatter `name: graphql` and a specific
`description`, then add `graphql` to `.cline/skills/README.md`, `docs/skills.md`,
and bump the counts in `docs/README.md` and `README.md`.

## Example 2 — Rewrite a hand-authored skill
User dropped a rough `.cline/skills/kafka/SKILL.md` and asks Claude to make it
consistent. → Read it first, **ask** "Rewrite to add proper `name`/`description`
frontmatter and structure, keeping your scope?" Only rewrite after a yes.

## Example 3 — Update with a critical change
User: "Rename `node` to `backend`." → This breaks references, so **confirm**
first, then rename `.cline/skills/node/` to `.cline/skills/backend/`, update the
`name` field in `SKILL.md`, and propagate `node → backend` across every
reference document and any routing row.

## Example 4 — Delete
User: "Delete the `docker` skill." → **Ask** "Delete `docker` permanently?" If
yes, remove `.cline/skills/docker/` and strip it from all references; if no,
do nothing.
