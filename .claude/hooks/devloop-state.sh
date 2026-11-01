#!/usr/bin/env bash
# .claude/hooks/devloop-state.sh — the ONLY sanctioned writer of dev-loop run state.
# Run by the orchestrator (main thread) via Bash. The guard blocks Edit/Write on state files,
# and blocks subagents from running this script when hook input identifies them.
#
#   devloop-state.sh [--force] start <task-id> <bugfix|port|feature> [base-ref]
#   devloop-state.sh phase <phase> [role]   investigate|plan|gate|implement|test|fix|review|finalize|paused|done
#   devloop-state.sh iter [n]               no arg: +1; exit 4 if that would exceed max_iterations
#   devloop-state.sh protect <path|glob>... run-scoped protection; existing files are also hash-pinned
#   devloop-state.sh verify-pins            exit 1 if any pinned file changed or was deleted
#   devloop-state.sh allow <path>...        HUMAN-APPROVED exceptions: implementer may modify these protected files
#   devloop-state.sh set <key> <value> | get <key>
#   devloop-state.sh show [task-id] | list
#   devloop-state.sh [--force] resume <task-id>
#   devloop-state.sh end [outcome]          deactivate; keeps .devloop/<task>/ for audit and resume
#
# Files: .devloop/<task>/state (source of truth, key=value) · .devloop/ACTIVE (copy for hooks)
#        .devloop/<task>/protected.txt · .devloop/<task>/allow.txt
# Exit: 0 ok · 2 usage/state error · 3 read-only drift detected (transition still applied) · 4 iteration cap
set -u
HOOK_DIR=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
# shellcheck source=devloop-lib.sh
. "$HOOK_DIR/devloop-lib.sh" 2>/dev/null || { echo "devloop-state: devloop-lib.sh missing" >&2; exit 2; }

FORCE=0
[ "${1:-}" = "--force" ] && { FORCE=1; shift; }
CMD=${1:-help}; [ $# -gt 0 ] && shift
PHASES="investigate plan plan-review gate implement test verify fix review finalize paused done"

die()        { echo "devloop-state: $*" >&2; exit 2; }
valid_task() { case "$1" in ''|.*|*[!A-Za-z0-9._-]*) return 1 ;; esac; }
in_git()     { git -C "$DL_PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; }

kv_set() {  # file key value
  case "$2" in ''|*[!a-z0-9_]*) die "bad key '$2'" ;; esac
  case "$3" in *"
"*) die "value for '$2' contains a newline" ;; esac
  local tmp="$1.tmp.$$"
  { [ -f "$1" ] && awk -v k="$2" 'index($0, k "=") != 1' "$1"; printf '%s=%s\n' "$2" "$3"; } > "$tmp" \
    && mv -f "$tmp" "$1" || die "cannot write $1"
}
touch_state() { kv_set "$1" updated "$(date +%s)"; }
sync_active() { cp "$1" "$DL_ACTIVE.tmp.$$" && mv -f "$DL_ACTIVE.tmp.$$" "$DL_ACTIVE" || die "cannot write $DL_ACTIVE"; }
need_active() {
  [ -f "$DL_ACTIVE" ] || die "no active run (.devloop/ACTIVE missing)"
  dl_load_state || die ".devloop/ACTIVE is malformed"
  ST="$DL_TASK_DIR/state"; [ -f "$ST" ] || die "missing $ST"
}
default_role() {
  case "$1" in
    investigate) echo investigator ;; plan) echo planner ;; gate) echo human ;;
    implement) echo implementer ;; test) echo tester ;; fix) echo fixer ;;
    verify) echo browser-tester ;; plan-review|review) echo reviewers ;; finalize) echo finalizer ;; *) echo none ;;
  esac
}
# Fingerprint of the working tree outside .devloop/ (detects writes during read-only phases,
# including writes made through Bash that the guard could not see).
tree_fp() { dl_tree_fp; }

set_phase() {
  local new=${1:-} role=${2:-} old rc=0 fp_old fp_new
  case " $PHASES " in *" $new "*) ;; *) die "unknown phase '$new' (one of: $PHASES)" ;; esac
  [ -n "$role" ] || role=$(default_role "$new")
  old=$(dl_kv_get "$ST" phase)
  # Finalize only code that is pinned-intact and exactly what the reviewers saw (re-checked after every pause).
  if [ "$new" = finalize ] && [ "$FORCE" != 1 ]; then
    local pins_out cur rev
    pins_out=$(cmd_verify_pins 2>&1) || die "cannot finalize: $(printf '%s' "$pins_out" | tr '\n' ' ')(go back to the fix loop, or --force after a human decision)"
    rev=$(dl_kv_get "$ST" reviewed_diff)
    if [ -n "$rev" ]; then
      cur=$(bash "$HOOK_DIR/devloop-run.sh" diffhash 2>/dev/null) || die "cannot finalize: diff hash unavailable (no usable base commit)"
      [ "$cur" = "$rev" ] || die "cannot finalize: the code changed after review (diff $cur, reviewed $rev). Re-run test and review first."
    fi
  fi
  if [ "$(dl_class_for_phase "$old")" = readonly ] && [ "$old" != gate ] && in_git; then
    fp_old=$(dl_kv_get "$ST" ro_fingerprint); fp_new=$(tree_fp)
    if [ -n "$fp_old" ] && [ "$fp_old" != "$fp_new" ]; then
      echo "WARNING: files outside .devloop/ changed during read-only phase '$old'. Inspect: git status; git diff" >&2
      kv_set "$ST" ro_violation "$old"; rc=3
    fi
  fi
  kv_set "$ST" phase "$new"; kv_set "$ST" role "$role"
  if [ "$(dl_class_for_phase "$new")" = readonly ] && in_git; then
    kv_set "$ST" ro_fingerprint "$(tree_fp)"
    kv_set "$ST" ro_snapshot "$(dl_snapshot_tree)"      # lets the integrity hook undo writes in this phase
  else kv_set "$ST" ro_fingerprint ""; kv_set "$ST" ro_snapshot ""; fi
  touch_state "$ST"; sync_active "$ST"
  echo "task=$DL_TASK phase=$new role=$role iteration=$(dl_kv_get "$ST" iteration)"
  return $rc
}

cmd_start() {
  local task=${1:-} mode=${2:-} ref=${3:-HEAD} dir st base=none dirty=unknown other files g
  valid_task "$task" || die "invalid task id '$task' (A-Z a-z 0-9 . _ -, not starting with '.')"
  case "$mode" in bugfix|port|feature) ;; *) die "mode must be bugfix|port|feature" ;; esac
  if [ -f "$DL_ACTIVE" ] && [ "$FORCE" != 1 ]; then
    other=$(dl_kv_get "$DL_ACTIVE" task_id); die "run '$other' is active; end it or pass --force"
  fi
  dir="$DL_DIR/$task"; st="$dir/state"
  if [ -e "$st" ] && [ "$FORCE" != 1 ]; then die "task '$task' exists; use: resume $task"; fi
  mkdir -p "$dir" || die "cannot create $dir"
  if in_git; then
    base=$(git -C "$DL_PROJECT_DIR" rev-parse --verify --quiet "$ref^{commit}") \
      || die "cannot resolve base ref '$ref' (empty repo? make an initial commit)"
    if [ -n "$(git -C "$DL_PROJECT_DIR" status --porcelain -- . ':(exclude).devloop' 2>/dev/null)" ]; then dirty=yes; else dirty=no; fi
  fi
  : > "$st" || die "cannot write $st"
  kv_set "$st" task_id "$task"; kv_set "$st" mode "$mode"; kv_set "$st" iteration 0
  kv_set "$st" base_commit "$base"; kv_set "$st" base_dirty "$dirty"; kv_set "$st" started "$(date +%s)"
  { echo "# Run-scoped protected globs: snapshot of config protected_paths + 'protect' additions."
    dl_cfg_list protected_paths; } > "$dir/protected.txt"
  : > "$dir/allow.txt"
  if in_git; then
    files=$(git -C "$DL_PROJECT_DIR" ls-files 2>/dev/null)
    while IFS= read -r g; do
      [ -n "$g" ] || continue
      printf '%s\n' "$files" | { while IFS= read -r f; do dl_glob_match "$f" "$g" && exit 0; done; exit 1; } ||
        echo "WARNING: protected_paths entry '$g' matches no tracked file. Your tests may be unprotected; check the pattern (e.g. 'test' vs 'tests')." >&2
    done <<EOF
$(dl_cfg_list protected_paths)
EOF
  fi
  sync_active "$st"; dl_load_state || die "state unreadable after write"
  ST=$st; set_phase investigate investigator >/dev/null
  [ "$dirty" = yes ] && echo "WARNING: uncommitted changes existed at start; they will appear in diffs vs base $base." >&2
  [ "$base" = none ] && echo "WARNING: not a git repo; tamper-check and drift detection are disabled." >&2
  cmd_show "$task"
}

cmd_iter() {
  need_active
  local cur n max
  cur=$(dl_kv_get "$ST" iteration); case "$cur" in ''|*[!0-9]*) cur=0 ;; esac
  if [ -n "${1:-}" ]; then
    case "$1" in *[!0-9]*) die "iteration must be a number" ;; esac; n=$1
  else
    n=$((cur + 1))
    max=$(dl_kv_get "$ST" max_iterations)                     # per-run override (set max_iterations N)
    [ -n "$max" ] || max=$(dl_cfg_get loop max_iterations)
    case "$max" in ''|*[!0-9]*) max=3 ;; esac
    if [ "$n" -gt "$max" ]; then echo "iteration cap reached: $cur of max $max" >&2; exit 4; fi
  fi
  kv_set "$ST" iteration "$n"; touch_state "$ST"; sync_active "$ST"; echo "iteration=$n"
}

append_unique() {  # file items...
  local f=$1 x; shift
  for x in "$@"; do grep -Fxq -- "$x" "$f" 2>/dev/null || printf '%s\n' "$x" >> "$f"; done
}
# Normalise a user-given path to project-relative form (globs are kept, minus a leading ./).
norm_rel() {
  case "$1" in
    *[*?[]*) printf '%s\n' "${1#./}" ;;
    *) dl_rel "$(dl_abs "$1")" || die "'$1' is outside the project" ;;
  esac
}
cmd_protect() { need_active; [ $# -gt 0 ] || die "usage: protect <path-or-glob>..."
  in_git || die "protect needs git (pins are git blob hashes); nothing was pinned"
  local x h n
  local want=$#; set -f; set -- $(for x in "$@"; do norm_rel "$x"; done); set +f
  [ $# -eq "$want" ] || die "some paths could not be normalised (outside the project?); nothing was protected"
  for x in "$@"; do case "$x" in *[*?[]*) ;; *) [ -e "$DL_PROJECT_DIR/$x" ] || echo "WARNING: $x does not exist; protected as a pattern, not pinned" >&2 ;; esac; done
  append_unique "$DL_TASK_DIR/protected.txt" "$@"
  # Pin the content of files that exist now (new tests, the repro test): any later change is tampering.
  for x in "$@"; do
    if [ -f "$DL_PROJECT_DIR/$x" ]; then
      h=$(git -C "$DL_PROJECT_DIR" hash-object -w -- "$x" 2>/dev/null) || continue   # -w: content kept, so it can be restored
      awk -F'\t' -v p="$x" '$1 != p' "$DL_TASK_DIR/protected-hashes.txt" 2>/dev/null > "$DL_TASK_DIR/protected-hashes.txt.tmp.$$"
      printf '%s\t%s\n' "$x" "$h" >> "$DL_TASK_DIR/protected-hashes.txt.tmp.$$"
      mv -f "$DL_TASK_DIR/protected-hashes.txt.tmp.$$" "$DL_TASK_DIR/protected-hashes.txt"
    fi
  done
  n=$(grep -c . "$DL_TASK_DIR/protected-hashes.txt" 2>/dev/null) || n=0
  kv_set "$ST" pins "$n"
  # Authoritative copy in git: agents can't change it without `git update-ref`, which the guard blocks.
  if [ -s "$DL_TASK_DIR/protected-hashes.txt" ]; then
    h=$(git -C "$DL_PROJECT_DIR" hash-object -w -- "$DL_TASK_DIR/protected-hashes.txt") &&
      git -C "$DL_PROJECT_DIR" update-ref "$(dl_pin_ref)" "$h" || die "could not record pins in git"
  fi
  touch_state "$ST"; sync_active "$ST"; echo "protected: $*"; }
cmd_verify_pins() {   # exit 0 all pinned files unchanged, 1 otherwise (prints the offenders)
  need_active; local p h cur bad=0 list n want
  list=$(dl_pin_list)
  want=$(dl_kv_get "$ST" pins); case "$want" in ''|*[!0-9]*) want=0 ;; esac
  n=$(printf '%s\n' "$list" | grep -c .)
  if [ "$n" -lt "$want" ]; then echo "PIN_LIST_SHORT: state records $want pinned file(s), the pin list has $n"; bad=1; fi
  if [ -z "$list" ]; then [ "$bad" = 0 ] && echo "no pinned files"; return $bad; fi
  if git -C "$DL_PROJECT_DIR" rev-parse --verify --quiet "$(dl_pin_ref)" >/dev/null 2>&1 &&
     [ "$(cat "$DL_TASK_DIR/protected-hashes.txt" 2>/dev/null)" != "$list" ]; then
    echo "PIN_LIST_TAMPERED: protected-hashes.txt differs from the pins recorded in git (restored)"
    printf '%s\n' "$list" > "$DL_TASK_DIR/protected-hashes.txt"; bad=1
  fi
  while IFS="$TAB" read -r p h; do
    [ -n "$p" ] || continue
    if [ ! -f "$DL_PROJECT_DIR/$p" ]; then echo "PIN_DELETED $p"; bad=1; continue; fi
    cur=$(git -C "$DL_PROJECT_DIR" hash-object -- "$p")
    [ "$cur" = "$h" ] || { echo "PIN_CHANGED $p"; bad=1; }
  done <<EOF
$list
EOF
  [ "$bad" = 0 ] && echo "pins OK"; return $bad; }
cmd_allow() { need_active; [ $# -gt 0 ] || die "usage: allow <path>..."
  local x want=$#; set -f; set -- $(for x in "$@"; do norm_rel "$x"; done); set +f
  [ $# -eq "$want" ] || die "some paths could not be normalised (outside the project?); nothing was allowed"
  append_unique "$DL_TASK_DIR/allow.txt" "$@"; touch_state "$ST"; sync_active "$ST"
  echo "allowed for implementer (record the human approval in plan.md Gate Notes): $*"; }

cmd_set() { need_active; [ $# -eq 2 ] || die "usage: set <key> <value>"
  case "$1" in task_id|phase|role|base_commit) die "use the dedicated command for '$1'" ;; esac
  kv_set "$ST" "$1" "$2"; touch_state "$ST"; sync_active "$ST"; }
cmd_get() { need_active; [ $# -eq 1 ] || die "usage: get <key>"; dl_kv_get "$ST" "$1"; }

cmd_show() {
  local task=${1:-} dir f p
  if [ -z "$task" ]; then dl_load_state || die "no active run; use: show <task-id> | list"; task=$DL_TASK; fi
  dir="$DL_DIR/$task"; [ -f "$dir/state" ] || die "unknown task '$task'"
  echo "# state ($dir/state)"; cat "$dir/state"
  echo "# artifacts"
  for f in investigation plan plan-review-logic plan-review-regression plan-review-integration plan-review-performance \
           fix-log test-report browser-report review-logic review-regression review-integration review-performance gate summary; do
    p="$dir/$f.md"
    if [ -f "$p" ]; then
      printf '%-26s STATUS=%s VERDICT=%s ITERATION=%s GATE=%s TAMPER=%s\n' "$f" \
        "$(dl_header_get "$p" STATUS)" "$(dl_header_get "$p" VERDICT)" "$(dl_header_get "$p" ITERATION)" \
        "$(dl_header_get "$p" GATE)" "$(dl_header_get "$p" TAMPER)"
    else printf '%-26s (missing)\n' "$f"; fi
  done
}

cmd_list() {
  local s
  for s in "$DL_DIR"/*/state; do
    [ -f "$s" ] || continue
    printf '%s\tmode=%s\tphase=%s\titeration=%s\tupdated=%s\n' "$(dl_kv_get "$s" task_id)" \
      "$(dl_kv_get "$s" mode)" "$(dl_kv_get "$s" phase)" "$(dl_kv_get "$s" iteration)" "$(dl_kv_get "$s" updated)"
  done
}

cmd_resume() {
  local task=${1:-} st other ph
  valid_task "$task" || die "usage: resume <task-id>"
  st="$DL_DIR/$task/state"; [ -f "$st" ] || die "no saved state for '$task' (see: list)"
  if [ -f "$DL_ACTIVE" ] && [ "$FORCE" != 1 ]; then
    other=$(dl_kv_get "$DL_ACTIVE" task_id); [ "$other" = "$task" ] || die "run '$other' is active; end it or pass --force"
  fi
  ph=$(dl_kv_get "$st" phase); [ "$ph" = done ] && { kv_set "$st" phase paused; ph=paused; }
  # The tree may legitimately have changed between sessions: re-baseline drift detection.
  if [ "$(dl_class_for_phase "$ph")" = readonly ] && in_git; then kv_set "$st" ro_fingerprint "$(tree_fp)"; fi
  touch_state "$st"; sync_active "$st"; cmd_show "$task"
}

cmd_end() {
  if [ -f "$DL_ACTIVE" ] && { ! dl_load_state || [ ! -f "$DL_TASK_DIR/state" ]; }; then
    rm -f "$DL_ACTIVE"; echo "removed a broken .devloop/ACTIVE (its task state was missing)"; return 0
  fi
  need_active
  kv_set "$ST" phase done; kv_set "$ST" role none; kv_set "$ST" outcome "${1:-unspecified}"
  kv_set "$ST" ended "$(date +%s)"; touch_state "$ST"; rm -f "$DL_ACTIVE"; echo "ended $DL_TASK"; }

case "$CMD" in
  start)   cmd_start "$@" ;;
  phase)   need_active; set_phase "${1:-}" "${2:-}"; exit $? ;;
  iter)    cmd_iter "$@" ;;
  protect) cmd_protect "$@" ;;
  verify-pins) cmd_verify_pins; exit $? ;;
  allow)   cmd_allow "$@" ;;
  set)     cmd_set "$@" ;;
  get)     cmd_get "$@" ;;
  show)    cmd_show "$@" ;;
  list)    cmd_list ;;
  resume)  cmd_resume "$@" ;;
  end)     cmd_end "$@" ;;
  help|-h|--help) sed -n '2,21p' "$0" ;;
  *) die "unknown command '$CMD' (try: help)" ;;
esac
