# Reasoning Procedure: Cline Skill Handler

_No terminal commands — reasoning + file authoring only._

## Reference documents to keep in sync

Any create (with rename), or delete of a Cline skill must be reflected in:

- `.agents/skills/README.md` — Implementation Skills list
- `docs/skills.md` — "Implementation Skills (Cline)" table + skill count
- `docs/README.md` — skill count in the `skills.md` row
- `README.md` — repo-structure tree ("N implementation skills")
- `.claude/rules/routing.md` — "Typical skills" column, if the skill is routed
- `docs/router.md` — routing table, if the skill is routed

## Create

1. Confirm the skill name and its intended scope (what Cline builds with it).
2. If the user already hand-authored a skill under `.agents/skills/<name>/`,
   read it and **ask** whether to rewrite it for consistency before touching it.
3. Scaffold `.agents/skills/<name>/` with the five files; set frontmatter
   `kind: implementation`, `engine: cline`.
4. Fill each file minimally: purpose/when-to-use (`skill.md`), do/don't
   (`rules.md`), real CLI commands (`commands.md`), worked examples
   (`examples.md`), self-verify list (`checklist.md`).
5. Add the skill to every reference document above.

## Update

1. Identify the target skill and the exact change requested.
2. Flag any **critical change** (rename, capability removal, workflow-breaking)
   and **ask** the user to confirm before applying.
3. Apply the minimal edit to the relevant file(s) in the skill directory.
4. If the name changed, propagate the rename to every reference document.

## Delete

1. **Ask** the user to confirm they really want to delete the skill.
2. If **no** → do nothing and stop.
3. If **yes** → remove `.agents/skills/<name>/` and its entry from every
   reference document; verify no workflow or routing row still points to it.
