# Rules: Cline Skill Handler

## Do
- Author Cline skills as a single `SKILL.md` under `.cline/skills/<name>/`.
- Set frontmatter `name` and `description` — `description` controls when Cline
  activates the skill (progressive loading); make it specific and trigger-accurate.
- Keep `SKILL.md` under 5,000 tokens; put deeper docs in `docs/` and reference
  them via `read_file` instructions inside the skill.
- Before rewriting a user-authored skill, review it and **ask** for confirmation.
- Confirm any **critical change** before applying: renaming a skill, removing a
  capability other tasks rely on, or anything that breaks an existing workflow.
- Before deleting, **ask** the user to confirm; only proceed on an explicit yes.
- After any create/rename/delete, update every reference document (see
  `commands.md`) so counts, tables, and links stay accurate.
- Keep content minimal and accurate — match the terse style of sibling skills.

## Don't
- Don't use `kind`/`engine` frontmatter — Cline only reads `name` and `description`.
- Don't write, run, build, lint, or test implementation code — this authors
  skill definitions only.
- Don't rewrite a hand-authored skill without asking first.
- Don't rename or delete a skill without confirming the critical change.
- Don't leave a dangling reference: a deleted/renamed skill must vanish from all
  docs and the routing table in the same change.
- Don't silently change a skill's scope; surface breaking changes to the user.
