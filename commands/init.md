---
description: Initialize Strix in the current project (seed .strix/ and .clinerules/).
---

Scaffold Strix into the current project by running the plugin's idempotent
scaffolder. Use the `strix-init` skill's procedure.

Run:

```sh
"${CLAUDE_PLUGIN_ROOT}/bin/strix-init"
```

$ARGUMENTS

Then report which files were written vs. skipped, and remind the user to:
1. Reopen the project so the Strix SessionStart hook activates (it detects `.strix/`).
2. Run the `project-scan` skill to populate `.strix/knowledge/*` from the real codebase.
3. Open the project in Cline so `.clinerules/` is picked up.

Do not pass `--force` unless the user explicitly asked to overwrite existing seed files.
