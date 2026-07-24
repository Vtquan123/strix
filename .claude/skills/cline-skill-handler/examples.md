# Examples: Cline Skill Handler

## Example 1 — Create a new skill
User: "Add a `graphql` skill for Cline." → Confirm scope, scaffold
`.agents/skills/graphql/` with the five files (`kind: implementation`), then add
`graphql` to the implementation list in `.agents/skills/README.md`, `docs/skills.md`,
bump the counts in `docs/README.md` and `README.md`.

## Example 2 — Rewrite a hand-authored skill
User dropped a rough `.agents/skills/kafka/skill.md` and asks Claude to make it
consistent. → Read it first, **ask** "Rewrite it into the five-file contract,
keeping your scope?" Only rewrite after a yes.

## Example 3 — Update with a critical change
User: "Rename `node` to `backend`." → This breaks references, so **confirm**
first, then rename the directory and propagate `node → backend` across every
reference document and any routing row.

## Example 4 — Delete
User: "Delete the `docker` skill." → **Ask** "Delete `docker` permanently?" If
yes, remove `.agents/skills/docker/` and strip it from all references; if no,
do nothing.
