---
description: Initialize Strix in the current project (choose an executor, seed .strix/ and the executor's config).
---

Scaffold Strix into the current project by running the plugin's idempotent
scaffolder. Use the `strix-init` skill's procedure.

**First, choose the executor.** Strix always uses Claude as the orchestrator, but
the executor that implements tasks is selectable. Unless the user already passed
`--executor <id>` in `$ARGUMENTS`, ask them with `AskUserQuestion` which executor
to use:

- **Cline** — seeds `.clinerules/` (opened in the Cline extension).
- **GitHub Copilot** — seeds `.github/` instructions + prompt files.
- **Claude** — seeds an isolated `strix-executor` subagent (`.claude/agents/`) +
  `.strix/executor/` config.

Then run (substituting the chosen id — pass through an explicit one from
`$ARGUMENTS` if present):

```sh
"${CLAUDE_PLUGIN_ROOT}/bin/strix-init" --executor <cline|copilot|claude>
```

$ARGUMENTS

Then report which files were written vs. skipped, and remind the user to:
1. Reopen the project so the Strix SessionStart hook activates (it detects `.strix/`).
2. Run the `project-scan` skill to populate `.strix/knowledge/*` from the real codebase.
3. Open/enable the chosen executor (the scaffolder prints the executor-specific step).

Do not pass `--force` unless the user explicitly asked to overwrite existing seed
files or to switch a project to a different executor.
