# Shared shell helpers for bin/strix-init and hooks/strix-context.sh.
#
# Sourced, never executed. Bash 3.2+ (the macOS system bash), plus awk and sed;
# no other dependencies, because both callers run in projects that install nothing.
#
# The YAML read here is deliberately shallow: one top-level `key: value` line,
# or one field of a list item in config/executors.yaml. Both files are flat by
# design, and validate-config checks the plugin's own copies with a real parser.

# yaml_value <file> <key>
# Print the scalar value of a top-level `key:` line. Strips a CR, surrounding
# single or double quotes, and a trailing `# comment`. Prints nothing when the
# file or key is missing.
yaml_value() {
  [ -f "$1" ] || return 0
  awk -v key="$2" -v sq="'" '
    { sub(/\r$/, "") }
    index($0, key ":") == 1 {
      v = substr($0, length(key) + 2)
      sub(/^[ \t]+/, "", v)
      q = substr(v, 1, 1)
      if (q == "\"" || q == sq) {
        v = substr(v, 2)
        e = index(v, q)
        if (e) v = substr(v, 1, e - 1)
      } else {
        sub(/[ \t]+#.*$/, "", v)
        sub(/[ \t]+$/, "", v)
      }
      print v
      exit
    }
  ' "$1"
}

# executor_ids <catalog>
# Print every executor id declared in config/executors.yaml, one per line.
executor_ids() {
  [ -f "$1" ] || return 0
  awk '
    { sub(/\r$/, "") }
    /^[ \t]*-[ \t]*id:[ \t]*/ { v = $0; sub(/^[ \t]*-[ \t]*id:[ \t]*/, "", v); sub(/[ \t]+$/, "", v); print v }
  ' "$1"
}

# executor_field <catalog> <id> <key>
# Print one field of one executor's block in config/executors.yaml.
executor_field() {
  [ -f "$1" ] || return 0
  awk -v want="$2" -v key="$3" '
    { sub(/\r$/, "") }
    /^[ \t]*-[ \t]*id:[ \t]*/ {
      id = $0; sub(/^[ \t]*-[ \t]*id:[ \t]*/, "", id); sub(/[ \t]+$/, "", id)
      inblk = (id == want); next
    }
    inblk {
      pat = "^[ \t]*" key ":[ \t]*"
      if ($0 ~ pat) { v = $0; sub(pat, "", v); sub(/[ \t]+$/, "", v); print v; exit }
    }
  ' "$1"
}

# is_known_executor <catalog> <id>
# Succeed only for a well-formed id that the catalog declares. The shape check
# comes first so an id can never carry a path (`../x`) into a template lookup.
is_known_executor() {
  case "$2" in
    ''|-*|*[!a-z0-9-]*) return 1 ;;
  esac
  executor_ids "$1" | grep -qx -- "$2"
}

# write_local_root <strix-dir> <plugin-root>
# Record this machine's plugin root in <strix-dir>/local.yaml for the task-board
# shim, and keep that file out of git. Prints what it changed, if anything.
write_local_root() {
  local dir="$1" root="$2" local_file ignore
  local_file="$dir/local.yaml"
  ignore="$dir/.gitignore"

  # Quoted, so a path holding " #" is not read back as a comment. Single quotes
  # only when the path itself holds a double quote.
  local quoted="\"$root\""
  case "$root" in *'"'*) quoted="'$root'" ;; esac

  if [ "$(yaml_value "$local_file" plugin_root)" != "$root" ]; then
    printf '%s\n' \
      '# Machine-local Strix settings. Gitignored: never commit this file.' \
      '# Written by strix-init and refreshed by the Strix SessionStart hook, so' \
      '# .strix/bin/strix-task can find the plugin outside Claude Code.' \
      "plugin_root: $quoted" > "$local_file" || return 1
    echo "  wrote: $local_file"
  fi

  if ! { [ -f "$ignore" ] && grep -qx 'local.yaml' "$ignore"; }; then
    # Never glue the entry onto a last line that has no newline.
    if [ -s "$ignore" ] && [ -n "$(tail -c 1 "$ignore")" ]; then
      printf '\n' >> "$ignore" || return 1
    fi
    printf 'local.yaml\n' >> "$ignore" || return 1
    echo "  wrote: $ignore"
  fi
}
