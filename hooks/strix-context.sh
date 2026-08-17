#!/usr/bin/env bash
# SessionStart context injector for Strix.
#
# When the project has a .strix/ directory, prints the generic operating contract
# (hooks/strix-context.md) and then the ACTIVE EXECUTOR resolved from the
# project's .strix/config.yaml against the plugin's config/executors.yaml.
#
# Dependency-free (bash + awk/sed) so it runs in any consuming project without
# node_modules. Invoked from hooks/hooks.json.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"

# Strix is active only when the project has a .strix/ directory.
[ -d "$PROJECT_DIR/.strix" ] || exit 0

# 1. The generic, tool-agnostic operating contract.
if [ -n "$PLUGIN_ROOT" ] && [ -f "$PLUGIN_ROOT/hooks/strix-context.md" ]; then
  cat "$PLUGIN_ROOT/hooks/strix-context.md"
fi

CONFIG="$PROJECT_DIR/.strix/config.yaml"
CATALOG="$PLUGIN_ROOT/config/executors.yaml"

printf '\n## Active Executor\n\n'

# 2. Which executor does this project use?
if [ ! -f "$CONFIG" ]; then
  echo "No \`.strix/config.yaml\` found — run \`/strix:init\` to record which executor this project uses."
  exit 0
fi

EXEC_ID="$(sed -n 's/^executor:[[:space:]]*//p' "$CONFIG" | head -1)"
if [ -z "$EXEC_ID" ]; then
  echo "No executor recorded in \`.strix/config.yaml\` — run \`/strix:init\`."
  exit 0
fi

# Pull one field's value from the executor's block in the catalog. Safe (no eval).
catalog_field() {
  # $1 = executor id, $2 = field key
  awk -v want="$1" -v key="$2" '
    /^[[:space:]]*-[[:space:]]*id:[[:space:]]*/ {
      id=$0; sub(/^[[:space:]]*-[[:space:]]*id:[[:space:]]*/,"",id); sub(/[[:space:]]*$/,"",id)
      inblk=(id==want); next
    }
    inblk {
      pat="^[[:space:]]*" key ":[[:space:]]*"
      if ($0 ~ pat) { v=$0; sub(pat,"",v); print v; exit }
    }
  ' "$CATALOG"
}

if [ -z "$PLUGIN_ROOT" ] || [ ! -f "$CATALOG" ]; then
  echo "Active executor: \`$EXEC_ID\`. Hand off all implementation to it."
  exit 0
fi

EX_LABEL="$(catalog_field "$EXEC_ID" label)"
EX_ROOT="$(catalog_field "$EXEC_ID" config_root)"
EX_HANDOFF="$(catalog_field "$EXEC_ID" handoff)"
EX_LABEL="${EX_LABEL:-$EXEC_ID}"

echo "Active executor: **$EX_LABEL** (\`$EXEC_ID\`). Hand off all implementation to it; resolve every execution capability to it via the capability matrix — never hard-code an executor."
[ -n "$EX_ROOT" ] && echo "Its counterpart config lives at \`$EX_ROOT/\`."
[ -n "$EX_HANDOFF" ] && echo "$EX_HANDOFF"
exit 0
