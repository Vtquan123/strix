# Skills

Skills carry reusable know-how so prompts stay small (Skill-First Design). The
Router selects them; they are recorded in a task's `Suggested Skills`.

## Two Kinds

| Kind | Engine | Location |
|------|--------|----------|
| Reasoning | Claude | [`.claude/skills/`](../.claude/skills/) |
| Implementation | Cline | [`.cline/skills/`](../.cline/skills/) |

## File Contracts

**Reasoning skills** (Claude) — five-file contract under `.claude/skills/<name>/`:

| File | Purpose |
|------|---------|
| `skill.md` | Overview: purpose, when to use, I/O, related skills |
| `examples.md` | Worked examples |
| `rules.md` | Do / Don't guardrails |
| `commands.md` | The step procedure |
| `checklist.md` | Self-verification checklist |

**Implementation skills** (Cline) — single file under `.cline/skills/<name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: One sentence — when Cline should activate this skill.
---
```

The `description` field drives Cline's progressive loading. Optional subdirs: `docs/`, `templates/`, `scripts/`.

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
| ADR | Record significant decisions |
| knowledge-update | Apply knowledge governance |
| cline-skill-handler | Create/update/delete Cline skills + sync references |

## Implementation Skills (Cline)

| Skill | Role |
|-------|------|
| react | Components |
| node | Backend/APIs |
| typescript | Precise typing |
| sql | Queries + migrations |
| testing | Behaviour tests |
| debugging | Root-cause fixes |
| git | Branches + commits |
| performance | Measured optimization |

## Extending

- **Reasoning skill** → copy the five-file contract into `.claude/skills/<name>/`.
- **Implementation skill** → create `.cline/skills/<name>/SKILL.md` using the `cline-skill-handler` Claude skill.

Then reference the skill from [../.claude/rules/routing.md](../.claude/rules/routing.md).
Index: [../.cline/skills/README.md](../.cline/skills/README.md).
