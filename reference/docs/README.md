# Strix Documentation

The complete documentation set for the Strix workflow framework.

| Doc | Covers |
|-----|--------|
| [architecture.md](./architecture.md) | The seven layers, two runtimes, principles |
| [workflow.md](./workflow.md) | Task-driven flow end to end |
| [router.md](./router.md) | The five routing functions + capability dispatch |
| [knowledge.md](./knowledge.md) | The knowledge layer + access model |
| [agents.md](./agents.md) | The four Claude agents (no coding agents) |
| [skills.md](./skills.md) | The skills + single-`SKILL.md` contract |
| [rules.md](./rules.md) | Claude + Cline rules and workflows |
| [governance.md](./governance.md) | When knowledge updates; anti-over-engineering |
| [task-templates.md](./task-templates.md) | Task fields + lifecycle |
| [adr-template.md](./adr-template.md) | ADR structure + discipline |
| [contribution-guide.md](./contribution-guide.md) | Using and extending Strix |

## Canonical Specs (outside docs/)

- Engine-agnostic core: [../workflow/](../workflow/)
- Claude rules: [../rules/](../rules/)
- Claude agents: [../../agents/](../../agents/)
- Claude reasoning skills: [../../skills/](../../skills/)
- Cline rules + workflows (seed): [../../templates/cline/.clinerules/](../../templates/cline/.clinerules/)
- Knowledge source of truth (seed): [../../templates/strix/knowledge/](../../templates/strix/knowledge/)
- Cline implementation skills (seed): [../../templates/cline/.clinerules/skills/](../../templates/cline/.clinerules/skills/)
- Tasks (seed): [../../templates/strix/tasks/](../../templates/strix/tasks/)

Start at the [root README](../../README.md).
