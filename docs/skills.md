# Skills

Skills carry reusable know-how so prompts stay small (Skill-First Design). The
Router selects them; they are recorded in a task's `Suggested Skills`.

## Two Kinds

| Kind | Engine | Location |
|------|--------|----------|
| Reasoning | Claude | [`skills/claude/`](../skills/claude/) |
| Implementation | Cline | [`skills/cline/`](../skills/cline/) |

## Five-File Contract

Every skill directory contains exactly five files:

| File | Purpose |
|------|---------|
| `skill.md` | Overview: purpose, when to use, I/O, related skills |
| `examples.md` | Worked examples |
| `rules.md` | Do / Don't guardrails |
| `commands.md` | Reasoning: the procedure. Implementation: real CLI commands |
| `checklist.md` | Self-verification checklist |

This uniform shape is what makes skills modular and extensible.

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

## Implementation Skills (Cline)

| Skill | Role |
|-------|------|
| react | Components |
| nextjs | Routing/rendering |
| node | Backend/APIs |
| typescript | Precise typing |
| sql | Queries + migrations |
| testing | Behaviour tests |
| debugging | Root-cause fixes |
| git | Branches + commits |
| docker | Containerization |
| security | Secure implementation |
| performance | Measured optimization |

## Extending

Copy the five-file structure into `skills/<kind>/<name>/`, then reference the
skill from [../claude/rules/routing.md](../claude/rules/routing.md). Index:
[../skills/README.md](../skills/README.md).
