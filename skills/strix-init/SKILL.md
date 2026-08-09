---
name: strix-init
description: Scaffold Strix into the current project — create the per-project .strix/ knowledge base and task board plus the .clinerules/ Cline config, by running the plugin's bin/strix-init scaffolder. Use when a user asks to initialize, set up, adopt, or turn on Strix in a project (e.g. "/strix:init", "set up Strix here", "adopt Strix"). Idempotent; existing files are preserved unless --force.
metadata:
  kind: reasoning
  engine: claude
---

# strix-init

## Purpose

Turn on Strix for the current project by seeding the two engine-agnostic
directories Strix needs:

- `.strix/` — the knowledge base (`knowledge/`, `knowledge/decisions/`) and the
  task board (`tasks/{queue,active,review,done,archive}`, plus `TEMPLATE.md`).
  Its presence is the single switch that activates the plugin's SessionStart
  contract for this project.
- `.clinerules/` — the Cline execution config (rules at root, `workflows/`,
  `skills/`), with all data paths already pointing at `.strix/…`.

Both are copied verbatim from the plugin's `templates/` seed by the shared
`bin/strix-init` scaffolder — the same implementation the standalone CLI uses.

## When To Use

- The user wants to initialize / set up / adopt Strix in a project.
- A project has no `.strix/` yet and the user wants Strix active.

Do **not** re-run to "update" an already-initialized project unless the user
explicitly asks; the scaffolder skips existing files by design.

## Procedure

1. Confirm the working directory is the project root the user wants Strix in.
2. Run the scaffolder via Bash:

   ```sh
   "${CLAUDE_PLUGIN_ROOT}/bin/strix-init"
   ```

   - Add `--target <dir>` to seed a project other than the current directory.
   - Add `--force` **only** if the user explicitly wants existing seed files
     overwritten (destructive to local edits of those files).

3. Report what was written vs. skipped (the script prints each path).
4. Point the user at the follow-up steps the script prints:
   - Reopen in Claude Code so the SessionStart hook activates (it detects
     `.strix/`).
   - Run the `project-scan` skill to replace the `.strix/knowledge/*` template
     placeholders with evidence from the real codebase.
   - Open the project in Cline so `.clinerules/` is picked up.

## Rules

- This is the one place Strix writes outside `.strix/` / `.clinerules/` in a
  target project — and only to create those two trees. Never scaffold anywhere
  else.
- Idempotent by default: never pass `--force` without explicit user intent.
- If the scaffolder cannot find its templates, `CLAUDE_PLUGIN_ROOT` is unset —
  fall back to `STRIX_PLUGIN_ROOT=<plugin dir>` and retry.

## Checklist

- [ ] Working directory is the intended project root
- [ ] Ran `bin/strix-init` (with `--target`/`--force` only as needed)
- [ ] Reported written/skipped files
- [ ] Surfaced the next steps (reopen, `project-scan`, Cline)
