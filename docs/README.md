# Strix Documentation

The complete documentation set for the Strix workflow framework.

| Doc | Covers |
|-----|--------|
| [architecture.md](./architecture.md) | The seven layers, two runtimes, principles |
| [workflow.md](./workflow.md) | Task-driven flow end to end |
| [router.md](./router.md) | The five routing functions + capability dispatch |
| [knowledge.md](./knowledge.md) | The knowledge layer + access model |
| [agents.md](./agents.md) | The four Claude agents (no coding agents) |
| [skills.md](./skills.md) | The 21 skills + five-file contract |
| [rules.md](./rules.md) | Claude + Cline rules and workflows |
| [governance.md](./governance.md) | When knowledge updates; anti-over-engineering |
| [task-templates.md](./task-templates.md) | Task fields + lifecycle |
| [adr-template.md](./adr-template.md) | ADR structure + discipline |
| [contribution-guide.md](./contribution-guide.md) | Using and extending Strix |

## Canonical Specs (outside docs/)

- Engine-agnostic core: [../workflow/](../workflow/)
- Claude rules + agents + reasoning skills: [../.claude/](../.claude/)
- Cline rules + workflows: [../.clinerules/](../.clinerules/)
- Knowledge source of truth: [../knowledge/](../knowledge/)
- Cline implementation skills: [../.agents/skills/](../.agents/skills/)
- Tasks: [../tasks/](../tasks/)

Start at the [root README](../README.md).
