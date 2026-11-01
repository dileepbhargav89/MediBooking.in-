#!/usr/bin/env bash
# .claude/hooks/devloop-lib.sh — shared helpers for dev-loop hooks/scripts. SOURCE it; do not execute.
# Rule: hooks FAIL OPEN. Missing tools/config/state => allow (and warn); never brick the session.
# Portable to bash 3.2 (macOS): no associative arrays, no ${x,,}, no mapfile.

# Windows (Git Bash / MSYS): normalise C:\x\y to /c/x/y so path checks don't fail open.
dl_unwin() {
  local p; p=$(printf '%s' "$1" | tr '\\' '/')
  case "$p" in
    [A-Za-z]:/*) if command -v cygpath >/dev/null 2>&1; then p=$(cygpath -u "$p")
                 else p="/$(printf '%s' "${p%%:*}" | tr 'A-Z' 'a-z')${p#?:}"; fi ;;
  esac
  printf '%s\n' "$p"
}
DL_PROJECT_DIR=$(dl_unwin "${CLAUDE_PROJECT_DIR:-$PWD}")
DL_DIR="$DL_PROJECT_DIR/.devloop"
DL_ACTIVE="$DL_DIR/ACTIVE"
DL_CONFIG="$DL_DIR/config.yaml"
TAB=$(printf '\t')
# Case-insensitive filesystems (macOS, Windows): compare paths in lower case so `Tests/` can't dodge `tests`.
case "${DEVLOOP_CASE_INSENSITIVE:-auto}" in
  1|yes|true) DL_NOCASE=1 ;; 0|no|false) DL_NOCASE=0 ;;
  *) case "$(uname -s 2>/dev/null)" in Darwin|MINGW*|MSYS*|CYGWIN*) DL_NOCASE=1 ;; *) DL_NOCASE=0 ;; esac ;;
esac
dl_lc() { if [ "$DL_NOCASE" = 1 ]; then printf '%s\n' "$1" | tr 'A-Z' 'a-z'; else printf '%s\n' "$1"; fi; }

dl_have()    { command -v "$1" >/dev/null 2>&1; }
dl_json_ok() { dl_have jq || dl_have python3; }

# dl_json_get <json> <dotted.path> -> value ("" if absent/null; non-strings printed as JSON, e.g. true)
dl_json_get() {
  if dl_have jq; then
    printf '%s' "$1" | jq -r --arg p "$2" \
      'getpath($p | split(".")) | if . == null then empty elif type == "string" then . else tojson end' 2>/dev/null
  elif dl_have python3; then
    printf '%s' "$1" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    for k in sys.argv[1].split("."):
        d = d.get(k) if isinstance(d, dict) else None
    if d is not None:
        print(d if isinstance(d, str) else json.dumps(d))
except Exception:
    pass
' "$2"
  else
    return 2
  fi
}

# stdin -> JSON string literal
dl_json_quote() {
  if dl_have jq; then jq -Rs .
  elif dl_have python3; then python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
  else return 1; fi
}

# Allow the tool call but tell the user why enforcement was skipped.
dl_allow_warn() {
  local m
  m=$(printf 'dev-loop: %s' "$1" | dl_json_quote 2>/dev/null) && printf '{"systemMessage": %s}\n' "$m"
  printf 'dev-loop: %s\n' "$1" >&2
  exit 0
}

# Blocking uses the JSON decision protocol with exit 0, never exit 2. Only exit 2 blocks in Claude Code,
# and a crashed script (e.g. CRLF line endings) also exits 2. With JSON decisions a crash is just a
# non-blocking error, and settings.json adds `|| true` on top. stderr keeps a human-readable copy.
dl_block() {   # PreToolUse: deny this tool call
  local m
  printf 'dev-loop guard: %s\n' "$1" >&2
  m=$(printf 'dev-loop guard: %s' "$1" | dl_json_quote 2>/dev/null) || exit 2
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":%s}}\n' "$m"
  exit 0
}
dl_stop_block() {   # Stop / SubagentStop: refuse to stop, with a reason for the model
  local m
  printf '%s\n' "$1" >&2
  m=$(printf '%s' "$1" | dl_json_quote 2>/dev/null) || exit 2
  printf '{"decision":"block","reason":%s}\n' "$m"
  exit 0
}

# key=value files (ACTIVE, state)
dl_kv_get() { [ -r "$1" ] && sed -n "s/^$2=//p" "$1" | head -n 1 | tr -d '\r'; }

dl_load_state() {
  [ -r "$DL_ACTIVE" ] || return 1
  DL_TASK=$(dl_kv_get "$DL_ACTIVE" task_id)
  case "$DL_TASK" in ''|.*|*[!A-Za-z0-9._-]*) return 1 ;; esac
  DL_PHASE=$(dl_kv_get "$DL_ACTIVE" phase)
  DL_ROLE=$(dl_kv_get "$DL_ACTIVE" role)
  DL_MODE=$(dl_kv_get "$DL_ACTIVE" mode)
  DL_ITER=$(dl_kv_get "$DL_ACTIVE" iteration); case "$DL_ITER" in ''|*[!0-9]*) DL_ITER=0 ;; esac
  DL_BASE=$(dl_kv_get "$DL_ACTIVE" base_commit)
  DL_UPDATED=$(dl_kv_get "$DL_ACTIVE" updated)
  DL_TASK_DIR="$DL_DIR/$DL_TASK"
  return 0
}

# ---- minimal YAML-subset reader -------------------------------------------------------------
DL_AWK_UNQ='
function unq(v,   c, rest, i) {
  sub(/^[[:space:]]+/, "", v); sub(/\r$/, "", v)
  c = substr(v, 1, 1)
  if (c == "\"" || c == sq) {
    rest = substr(v, 2); i = index(rest, c)
    return (i > 0) ? substr(rest, 1, i - 1) : rest
  }
  sub(/[[:space:]]+#.*$/, "", v); sub(/^#.*$/, "", v); sub(/[[:space:]]+$/, "", v)
  if (v == "null" || v == "~") v = ""
  return v
}'

# dl_cfg_get <section|""> <key>  -> scalar
dl_cfg_get() {
  [ -r "$DL_CONFIG" ] || return 0
  awk -v sec="$1" -v key="$2" -v sq="'" "$DL_AWK_UNQ"'
    /^[[:space:]]*#/ || /^[[:space:]]*$/ { next }
    /^[^[:space:]]/ {
      cur = $0; sub(/:.*/, "", cur)
      if (sec == "" && cur == key) { v = $0; sub(/^[^:]*:/, "", v); print unq(v); exit }
      next
    }
    sec != "" && cur == sec {
      line = $0; sub(/^[[:space:]]+/, "", line)
      if (index(line, key ":") == 1) { print unq(substr(line, length(key) + 2)); exit }
    }' "$DL_CONFIG"
}

# dl_cfg_list <top-level-key> -> one block-list item per line
dl_cfg_list() {
  [ -r "$DL_CONFIG" ] || return 0
  awk -v key="$1" -v sq="'" "$DL_AWK_UNQ"'
    /^[^[:space:]#]/ { inlist = (index($0, key ":") == 1); next }
    inlist && /^[[:space:]]*-[[:space:]]/ { v = $0; sub(/^[[:space:]]*-/, "", v); v = unq(v); if (v != "") print v }
  ' "$DL_CONFIG"
}

dl_stale_hours() { local h; h=$(dl_cfg_get hooks stale_hours); case "$h" in ''|*[!0-9]*) h=24 ;; esac; echo "$h"; }
dl_is_stale() {
  local h now
  h=$(dl_stale_hours); [ "$h" -eq 0 ] && return 1
  case "${DL_UPDATED:-}" in ''|*[!0-9]*) return 1 ;; esac
  now=$(date +%s)
  [ $((now - DL_UPDATED)) -gt $((h * 3600)) ]
}

# ---- caller identity (best effort) ----------------------------------------------------------
# Newer Claude Code versions may include agent_id/agent_type in hook input for subagent tool calls.
# If agent_type is "devloop-<role>", that role overrides the phase-derived policy. Absent => phase only.
dl_detect_agent() {
  DL_AGENT_ID=$(dl_json_get "$1" agent_id)
  DL_AGENT_TYPE=$(dl_json_get "$1" agent_type)
  DL_IS_SUBAGENT=0; [ -n "$DL_AGENT_ID" ] && DL_IS_SUBAGENT=1
  DL_CALLER_ROLE=""
  case "$DL_AGENT_TYPE" in devloop-*) DL_CALLER_ROLE=${DL_AGENT_TYPE#devloop-} ;; esac
}

dl_class_for_phase() {
  case "$1" in
    investigate|plan|plan-review|gate|test|verify|review) echo readonly ;;
    implement) echo implement ;; fix) echo fix ;; finalize) echo finalize ;;
    paused|done|'') echo idle ;; *) echo unknown ;;
  esac
}
dl_class_for_role() {
  case "$1" in
    investigator|planner|tester|browser-tester|review-*) echo readonly ;;
    implementer) echo implement ;; fixer) echo fix ;; finalizer) echo finalize ;; *) echo "" ;;
  esac
}
dl_phase_for_role() {
  case "$1" in
    investigator) echo investigate ;; planner) echo plan ;; implementer) echo implement ;;
    tester) echo test ;; browser-tester) echo verify ;; fixer) echo fix ;;
    review-*) case "${DL_PHASE:-}" in plan-review) echo plan-review ;; *) echo review ;; esac ;; finalizer) echo finalize ;; *) echo "" ;;
  esac
}

# ---- paths & globs --------------------------------------------------------------------------
# Absolute, lexically normalized path (collapses //, /./, /x/../). Does not resolve symlinks.
dl_abs() {
  local p prev="" in
  in=$(dl_unwin "$1")
  case "$in" in /*) p=$in ;; *) p="$DL_PROJECT_DIR/$in" ;; esac
  while [ "$p" != "$prev" ]; do
    prev=$p
    p=$(printf '%s\n' "$p" | sed -e 's#//*#/#g' -e 's#/\./#/#g' -e 's#/\.$##' \
                                 -e 's#/[^/][^/]*/\.\./#/#' -e 's#/[^/][^/]*/\.\.$##')
  done
  printf '%s\n' "${p:-/}"
}
# Follow symlinks (file and directories) of a normalized absolute path, where they exist.
dl_real() {
  local p=$1 t d b n=0
  while [ -L "$p" ] && [ $n -lt 8 ]; do
    t=$(readlink "$p" 2>/dev/null) || break
    case "$t" in /*) p=$(dl_abs "$t") ;; *) p=$(dl_abs "$(dirname "$p")/$t") ;; esac
    n=$((n + 1))
  done
  d=$(dirname "$p"); b=$(basename "$p")
  if [ -d "$d" ]; then d=$(cd -P "$d" 2>/dev/null && pwd -P) && p="${d%/}/$b"; fi
  printf '%s\n' "$p"
}
# Project-relative path of a normalized absolute path; returns 1 if outside the project.
# Checks the path as written AND with symlinks resolved, so a link into tests/ is seen as tests/.
# Lower-cased on case-insensitive filesystems.
dl_rel() {
  local root real rroot
  root=$(dl_abs "$DL_PROJECT_DIR")
  rroot=$(cd -P "$root" 2>/dev/null && pwd -P) || rroot=$root
  real=$(dl_real "$1")
  dl__under "$real" "$rroot" || dl__under "$real" "$root" || dl__under "$1" "$root"
}
dl__under() {   # <path> <root> -> prints path relative to root, or returns 1
  local pp=$1 rr=$2
  if [ "$DL_NOCASE" = 1 ]; then pp=$(dl_lc "$pp"); rr=$(dl_lc "$rr"); fi
  case "$pp" in "$rr"/*) printf '%s\n' "${pp#"$rr"/}"; return 0 ;; esac
  return 1
}
# '*' matches across '/', leading '**/' optional, '<dir>/**' or bare '<dir>' match the subtree.
dl_glob_match() {
  local p=$1 g=$2
  if [ "$DL_NOCASE" = 1 ]; then p=$(dl_lc "$1"); g=$(dl_lc "$2"); fi
  case "$g" in ./*) g=${g#./} ;; esac
  # shellcheck disable=SC2254
  case "$p" in $g) return 0 ;; esac
  case "$g" in '**/'*) case "$p" in ${g#'**/'}) return 0 ;; esac ;; esac
  case "$g" in *'/**') case "$p" in "${g%'/**'}"/*) return 0 ;; esac ;; esac
  case "$g" in *[*?[]*) ;; *) case "$p" in "${g%/}"/*) return 0 ;; esac ;; esac
  # A glob that names a directory protects its subtree (packages/*/tests -> packages/a/tests/x.py),
  # and a bare name protects that directory anywhere (tests -> packages/a/tests/x.py).
  case "$p" in ${g%/}/*) return 0 ;; esac
  case "$g" in */*) ;; *) case "/$p" in */${g%/}/*) return 0 ;; esac ;; esac
  return 1
}
dl_protected_globs() {
  { [ -n "${DL_TASK_DIR:-}" ] && [ -r "$DL_TASK_DIR/protected.txt" ] && cat "$DL_TASK_DIR/protected.txt"
    dl_cfg_list protected_paths; } 2>/dev/null |
    tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e '/^#/d' -e '/^$/d'
}
dl_is_protected() {
  dl_protected_globs | { while IFS= read -r g; do dl_glob_match "$1" "$g" && exit 0; done; exit 1; }
}

# Header block value: front matter between the first two '---' lines, "KEY: value  # comment"
dl_header_get() {
  awk -v k="$2" '
    NR == 1 { if ($0 != "---") exit; next }
    $0 == "---" { exit }
    index($0, k ":") == 1 {
      v = substr($0, length(k) + 2); sub(/[[:space:]]+#.*$/, "", v)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", v); print v; exit
    }' "$1" 2>/dev/null
}

dl_run_timeout() {
  local s=$1; shift
  if dl_have timeout; then timeout "$s" "$@"
  elif dl_have gtimeout; then gtimeout "$s" "$@"
  elif dl_have perl; then   # macOS has no timeout(1)
    perl -e 'my $t = shift; my $pid = fork; die "fork" unless defined $pid;
      if (!$pid) { setpgrp(0, 0); exec @ARGV; exit 127 }
      $SIG{ALRM} = sub { kill "TERM", -$pid; sleep 2; kill "KILL", -$pid; exit 124 };
      alarm $t; waitpid($pid, 0); exit(($? & 127) ? 128 + ($? & 127) : $? >> 8)' "$s" "$@"
  else "$@"; fi
}

# Run-scoped hash pins: "<path>\t<git blob hash>" lines written by `devloop-state.sh protect`.
# The authoritative pin list lives in git (refs/devloop/<task>/pins), written only by devloop-state.sh.
# protected-hashes.txt is a readable copy; editing or emptying it changes nothing.
dl_pin_ref() { printf 'refs/devloop/%s/pins\n' "$DL_TASK"; }
dl_pin_list() {
  [ -n "${DL_TASK:-}" ] || return 0
  if git -C "$DL_PROJECT_DIR" rev-parse --verify --quiet "$(dl_pin_ref)" >/dev/null 2>&1; then
    git -C "$DL_PROJECT_DIR" cat-file -p "$(dl_pin_ref)" 2>/dev/null
  elif [ -r "$DL_TASK_DIR/protected-hashes.txt" ]; then
    cat "$DL_TASK_DIR/protected-hashes.txt"
  fi
}
dl_is_pinned() {
  [ -n "${DL_TASK_DIR:-}" ] || return 1
  if [ "$DL_NOCASE" = 1 ]; then
    dl_pin_list | cut -f1 | tr 'A-Z' 'a-z' | grep -Fxq -- "$(dl_lc "$1")"
  else
    dl_pin_list | cut -f1 | grep -Fxq -- "$1"
  fi
}

# Fingerprint of the working tree outside .devloop/ and drift_ignore (detects writes during read-only phases).
dl_tree_fp() {
  local ign g
  set -- . ':(exclude).devloop'
  ign=$(dl_cfg_list drift_ignore)
  if [ -n "$ign" ]; then
    while IFS= read -r g; do [ -n "$g" ] && set -- "$@" ":(exclude)$g"; done <<EOF
$ign
EOF
  fi
  { git -C "$DL_PROJECT_DIR" status --porcelain=v1 --untracked-files=all -- "$@" 2>/dev/null
    git -C "$DL_PROJECT_DIR" diff --no-color HEAD -- "$@" 2>/dev/null
    git -C "$DL_PROJECT_DIR" ls-files -o --exclude-standard -z -- "$@" 2>/dev/null |
      (cd "$DL_PROJECT_DIR" && xargs -0 git hash-object 2>/dev/null)
  } | git hash-object --stdin
}
# Is <rel> covered by drift_ignore (build/test output)? Uses the same glob rules as protected_paths.
dl_is_drift() {
  local g
  while IFS= read -r g; do [ -n "$g" ] && dl_glob_match "$1" "$g" && return 0; done <<EOF
$(dl_cfg_list drift_ignore)
EOF
  return 1
}

# Is there a usable base commit? (fail closed: callers treat "no" as "can't prove it's safe")
dl_base_ok() {
  [ -n "${DL_BASE:-}" ] && [ "$DL_BASE" != none ] &&
    git -C "$DL_PROJECT_DIR" rev-parse --verify --quiet "$DL_BASE^{commit}" >/dev/null 2>&1
}
# Did <rel> exist at the base commit? Unknown (no git / no base) counts as YES, so protection holds.
dl_in_base() {
  dl_base_ok || return 0
  git -C "$DL_PROJECT_DIR" cat-file -e "$DL_BASE:$1" 2>/dev/null
}

# Command text with quoted strings removed (for spotting unquoted ; | > etc.)
dl_unquote_cmd() { printf '%s' "$1" | sed -E "s/'[^']*'//g; s/\"[^\"]*\"//g"; }

# Snapshot of the working tree (tracked AND untracked, minus .devloop/ and drift_ignore) as a git tree id,
# built in a private index so the user's real index is untouched. Used to undo writes in read-only phases.
dl_snapshot_tree() {
  local idx="$DL_TASK_DIR/snap.index" ign g
  set -- . ':(exclude).devloop'
  ign=$(dl_cfg_list drift_ignore)
  if [ -n "$ign" ]; then
    while IFS= read -r g; do [ -n "$g" ] && set -- "$@" ":(exclude)$g"; done <<EOF
$ign
EOF
  fi
  GIT_INDEX_FILE="$idx" git -C "$DL_PROJECT_DIR" add -A -- "$@" >/dev/null 2>&1 || return 1
  GIT_INDEX_FILE="$idx" git -C "$DL_PROJECT_DIR" write-tree 2>/dev/null
}
