#!/usr/bin/env bash
# SessionStart context injector for Strix.
#
# When the project has a .strix/ directory, prints the generic operating contract
# (hooks/strix-context.md) and then the ACTIVE EXECUTOR resolved from the
# project's .strix/config.yaml against the plugin's config/executors.yaml,
# followed by any setup problems worth fixing.
#
# Side effect: records this plugin's install path in .strix/local.yaml
# (gitignored) so .strix/bin/strix-task can find the plugin outside Claude Code.
#
# Dependency-free (bash 3.2 + awk/sed) so it runs in any consuming project without
# node_modules. Invoked from hooks/hooks.json.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
STRIX_DIR="$PROJECT_DIR/.strix"

# Strix is active only when the project has a .strix/ directory.
[ -d "$STRIX_DIR" ] || exit 0

# This script sits inside the plugin, so its own location is always a usable
# root. CLAUDE_PLUGIN_ROOT is preferred only when it really is this plugin.
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$HOOK_DIR/.." && pwd)"
GIVEN_ROOT=""
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "$CLAUDE_PLUGIN_ROOT/bin/strix-task.mjs" ]; then
  GIVEN_ROOT="$CLAUDE_PLUGIN_ROOT"
  PLUGIN_ROOT="$CLAUDE_PLUGIN_ROOT"
fi

# A session must never break on a damaged install.
[ -f "$HOOK_DIR/../lib/strix-common.sh" ] || exit 0
# shellcheck source=../lib/strix-common.sh
. "$HOOK_DIR/../lib/strix-common.sh"

# The schema of .strix/config.yaml this plugin version reads.
SUPPORTED_SCHEMA=1

WARNINGS=()
warn() { WARNINGS+=("$1"); }

# Only a path Claude Code handed us is worth recording; a guessed one is not.
if [ -n "$GIVEN_ROOT" ]; then
  write_local_root "$STRIX_DIR" "$GIVEN_ROOT" >/dev/null 2>&1 ||
    warn "could not record the plugin path in \`.strix/local.yaml\`; \`.strix/bin/strix-task\` may not find the plugin outside Claude Code."
fi

print_warnings() {
  [ "${#WARNINGS[@]}" -gt 0 ] || return 0
  printf '\n## Strix Setup Warnings\n\n'
  local w
  for w in "${WARNINGS[@]}"; do
    printf -- '- Warning: %s\n' "$w"
  done
}

# 1. The generic, tool-agnostic operating contract. The generated-region markers
#    are build plumbing, and the plugin path placeholder is resolved here because
#    hook output, unlike skill content, is not substituted by Claude Code.
CONTRACT="$PLUGIN_ROOT/hooks/strix-context.md"
if [ -f "$CONTRACT" ]; then
  STRIX_ROOT_SUB="$PLUGIN_ROOT" awk '
    BEGIN { p = "${CLAUDE_PLUGIN_ROOT}"; r = ENVIRON["STRIX_ROOT_SUB"] }
    /^<!-- strix:gen (start|end) id=[a-z0-9-]+ -->$/ { next }
    {
      out = ""; s = $0
      while ((i = index(s, p)) > 0) {
        out = out substr(s, 1, i - 1) r
        s = substr(s, i + length(p))
      }
      print out s
    }
  ' "$CONTRACT"
fi

CONFIG="$STRIX_DIR/config.yaml"
CATALOG="$PLUGIN_ROOT/config/executors.yaml"

printf '\n## Active Executor\n\n'

# 2. Which executor does this project use?
if [ ! -f "$CONFIG" ]; then
  echo "No \`.strix/config.yaml\` found — run \`/strix:init\` to record which executor this project uses."
  print_warnings
  exit 0
fi

SCHEMA="$(yaml_value "$CONFIG" schema)"
if [ -z "$SCHEMA" ]; then
  warn "\`.strix/config.yaml\` has no \`schema:\` line; this Strix version expects \`schema: $SUPPORTED_SCHEMA\`. Re-run \`/strix:init\`."
elif [ "$SCHEMA" != "$SUPPORTED_SCHEMA" ]; then
  warn "\`.strix/config.yaml\` declares schema $SCHEMA, but this Strix version reads schema $SUPPORTED_SCHEMA. Update the plugin or re-run \`/strix:init\`."
fi

# Knowledge still in its seeded form means every decision is made blind.
# Listed from inside .strix/ so the project path never meets a regex.
TEMPLATED="$(cd "$STRIX_DIR" && grep -l 'This is a TEMPLATE\.' knowledge/*.md 2>/dev/null | sed 's#^#.strix/#' | tr '\n' ' ' || true)"
if [ -n "$TEMPLATED" ]; then
  warn "these knowledge files are still templates: ${TEMPLATED% }. Run the \`project-scan\` skill before planning work."
fi

EXEC_ID="$(yaml_value "$CONFIG" executor)"
if [ -z "$EXEC_ID" ]; then
  echo "No executor recorded in \`.strix/config.yaml\` — run \`/strix:init\`."
  print_warnings
  exit 0
fi

if [ ! -f "$CATALOG" ]; then
  echo "Active executor: \`$EXEC_ID\`. Hand off all implementation to it."
  print_warnings
  exit 0
fi

if ! is_known_executor "$CATALOG" "$EXEC_ID"; then
  echo "Active executor: \`$EXEC_ID\`. Hand off all implementation to it."
  warn "\`$EXEC_ID\` in \`.strix/config.yaml\` is not a known executor ($(executor_ids "$CATALOG" | tr '\n' ' ' | sed 's/ $//')). Fix it with \`/strix:init\`."
  print_warnings
  exit 0
fi

EX_LABEL="$(executor_field "$CATALOG" "$EXEC_ID" label)"
EX_ROOT="$(executor_field "$CATALOG" "$EXEC_ID" config_root)"
EX_HANDOFF="$(executor_field "$CATALOG" "$EXEC_ID" handoff)"
EX_LABEL="${EX_LABEL:-$EXEC_ID}"

echo "Active executor: **$EX_LABEL** (\`$EXEC_ID\`). Hand off all implementation to it; resolve every execution capability to it via the capability matrix — never hard-code an executor."
[ -n "$EX_ROOT" ] && echo "Its counterpart config lives at \`$EX_ROOT/\`."
[ -n "$EX_HANDOFF" ] && echo "$EX_HANDOFF"
print_warnings
exit 0
