#!/usr/bin/env bash
# PreToolUse guardrail for Strix. See hooks/strix-guard.mjs for the rules.
#
# Stays out of the way everywhere else: a project without .strix/ returns at
# once, before Node starts. The guard is a safety net, not a security boundary,
# so if Node is missing it lets the call through rather than breaking the tool.

set -euo pipefail

[ -d "${CLAUDE_PROJECT_DIR:-$PWD}/.strix" ] || exit 0
command -v node >/dev/null 2>&1 || exit 0
exec node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/strix-guard.mjs"
