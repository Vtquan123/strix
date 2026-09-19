---
name: strix-init
description: Scaffold Strix into the current project — choose an executor (Cline, GitHub Copilot, or Claude), then create the per-project .strix/ knowledge base and task board plus the chosen executor's config, by running the plugin's bin/strix-init scaffolder. Use when a user asks to initialize, set up, adopt, or turn on Strix in a project (e.g. "/strix:init", "set up Strix here", "adopt Strix"). Idempotent; existing files are preserved unless --force-executor or --force, and project knowledge is never overwritten.
metadata:
  kind: reasoning
  engine: claude
---

# strix-init

## Purpose

Turn on Strix for the current project by seeding two things:

- `.strix/` — the engine-agnostic knowledge base (`knowledge/`,
  `knowledge/decisions/`) and task board (`tasks/{queue,active,review,done,archive}`,
  plus `TEMPLATE.md`). Its presence is the single switch that activates the
  plugin's SessionStart contract for this project. The scaffolder also writes
  `.strix/config.yaml` recording the chosen executor, the `.strix/bin/strix-task`
  shim every doc calls, and a gitignored `.strix/local.yaml` recording where the
  plugin is installed on this machine.
- The **chosen executor's** config, seeded in that tool's native location:
  - **Cline** → `.clinerules/` (rules, `workflows/`, `skills/`).
  - **GitHub Copilot** → `.github/` (`copilot-instructions.md`, `instructions/`,
    `prompts/`, `skills/`).
  - **Claude** → an isolated `.claude/agents/strix-executor.md` subagent plus its
    `.strix/executor/` contract (rules, `workflows/`, `skills/`).

All are copied from the plugin's `templates/` seed by the shared `bin/strix-init`
scaffolder. Data paths already point at `.strix/…`.

## When To Use

- The user wants to initialize / set up / adopt Strix in a project.
- A project has no `.strix/` yet and the user wants Strix active.

Do **not** re-run to "update" an already-initialized project unless the user
explicitly asks; the scaffolder skips existing files by design, and it will not
switch a project to a different executor without `--force-executor`.

## Procedure

1. Confirm the working directory is the project root the user wants Strix in.
2. **Ask which executor** (unless the user already specified one). Use
   `AskUserQuestion` with the three options — **Cline** (`.clinerules/`),
   **GitHub Copilot** (`.github/`), **Claude as executor** (isolated
   `.claude/agents/strix-executor.md` + `.strix/executor/`). Default: Cline.
3. Run the scaffolder via Bash with the chosen executor:

   ```sh
   "${CLAUDE_PLUGIN_ROOT}/bin/strix-init" --executor <cline|copilot|claude>
   ```

   - Add `--target <dir>` to seed a project other than the current directory.
   - Add `--force-executor` **only** if the user explicitly wants to switch an
     already-initialized project to a different executor, or to refresh the
     executor's files (local edits to those files are lost).
   - Add `--force` **only** if the user explicitly wants every plugin-owned seed
     file refreshed. It implies `--force-executor`.
   - Neither flag overwrites project state: `.strix/knowledge/**`,
     `.strix/tasks/workstreams.yaml`, and the executor's skill catalog are only
     written when missing. A file the user already had before this executor was
     first seeded (e.g. their own `.github/copilot-instructions.md`) is kept and
     flagged, even when forced. On a switch, the scaffolder lists the previous
     executor's files and deletes nothing.

4. Report what was written vs. skipped (the script prints each path and the
   recorded executor). Surface every `warning:` line: it means a file the user
   already had was kept, so the Strix version of it is not installed. On a
   switch, relay the list of leftover files from the previous executor.
5. Point the user at the follow-up steps the script prints:
   - Reopen in Claude Code so the SessionStart hook activates (it detects
     `.strix/`).
   - Run the `project-scan` skill to replace the `.strix/knowledge/*` template
     placeholders with evidence from the real codebase.
   - Open/enable the chosen executor (the script prints the executor-specific
     step).

## Rules

- This is the one place Strix writes outside `.strix/` and the executor's config
  directory in a target project — and only to create those trees. Never scaffold
  anywhere else.
- Idempotent by default: never pass `--force-executor` or `--force` without
  explicit user intent.
- Never silently switch a project's executor; the scaffolder warns and keeps the
  existing one unless `--force-executor` is given.
- Never delete the previous executor's files yourself; list them and let the
  user decide.
- If the scaffolder cannot find its templates, retry with
  `STRIX_PLUGIN_ROOT=<plugin dir>`.

## Checklist

- [ ] Working directory is the intended project root
- [ ] Asked the user which executor (or honored an explicit `--executor`)
- [ ] Ran `bin/strix-init --executor <id>` (with `--target`, `--force-executor`, or `--force` only as needed)
- [ ] Relayed every `warning:` line and any leftover-file list
- [ ] Reported written/skipped files and the recorded executor
- [ ] Surfaced the next steps (reopen, `project-scan`, open the executor)
