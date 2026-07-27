# Checklist: Cline Skill Handler

- [ ] Operation identified: create / update / delete
- [ ] Create: user-authored skill reviewed and rewrite confirmed before editing
- [ ] Create: `SKILL.md` written under `.cline/skills/<name>/`
- [ ] Frontmatter has `name` (kebab-case) and `description` (trigger sentence)
- [ ] `SKILL.md` body is under 5,000 tokens; overflow moved to `docs/`
- [ ] Update: critical changes (rename, capability/workflow break) confirmed
- [ ] Delete: user explicitly confirmed before removal
- [ ] All reference documents synced (README, docs/skills.md, docs/README.md,
      .cline/skills/README.md, routing table)
- [ ] Skill counts accurate; no dangling references remain
