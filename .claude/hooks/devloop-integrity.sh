#!/usr/bin/env bash
# .claude/hooks/devloop-integrity.sh — PostToolUse (Bash|Edit|Write|MultiEdit|NotebookEdit) during a dev-loop run.
#
# The guard tries to stop forbidden writes BEFORE a tool call, but a shell command can write files in endless
# ways (heredoc scripts, cd + relative paths, find -exec, patch, tar ...), so the guard can't be the boundary.
# This hook checks the RESULT after every tool call, whatever the command was:
#   1. pinned files (repro test, new tests) must match their pinned content    -> restored from git if not
#   2. protected files that existed at the base commit must be unchanged      -> restored from the base commit
#      (implement phase: unless approved in allow.txt; the implementer may ADD new protected files)
#   3. fix/finalize: no NEW files under protected paths                        -> reported (not deleted)
#   4. read-only phases (Bash only): the working tree must not change          -> reported
# Any finding is logged to .devloop/<task>/integrity.log (the tamper check and the logic reviewer see it) and
# sent back to the agent as a PostToolUse "block" decision with the reason. Restores are written by this hook.
# Fails open (exit 0, no decision) when state/git are unavailable. Off switch: DEVLOOP_GUARD=off.
set -u
HOOK_DIR=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
# shellcheck source=devloop-lib.sh
. "$HOOK_DIR/devloop-lib.sh" 2>/dev/null || exit 0

INPUT=$(cat)
[ "${DEVLOOP_GUARD:-on}" = "off" ] && exit 0
[ -f "$DL_ACTIVE" ] || exit 0
dl_json_ok || exit 0
dl_load_state || exit 0
dl_is_stale && exit 0
git -C "$DL_PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
dl_detect_agent "$INPUT"

CLASS=$(dl_class_for_phase "$DL_PHASE")
if [ -n "$DL_CALLER_ROLE" ]; then rc=$(dl_class_for_role "$DL_CALLER_ROLE"); [ -n "$rc" ] && CLASS=$rc; fi
case "$CLASS" in idle|unknown) exit 0 ;; esac
TOOL=$(dl_json_get "$INPUT" tool_name)
WHO="phase=$DL_PHASE${DL_CALLER_ROLE:+, caller=devloop-$DL_CALLER_ROLE}"
G="git -C $DL_PROJECT_DIR"
NL='
'
FOUND=""
note() {   # kind file detail
  FOUND="$FOUND- $3$NL"
  printf '%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" "$3 [$WHO, tool $TOOL]" >> "$DL_TASK_DIR/integrity.log" 2>/dev/null
}
PGLOBS=$(dl_protected_globs); DGLOBS=$(dl_cfg_list drift_ignore)
is_prot()  { local g; while IFS= read -r g; do [ -n "$g" ] && dl_glob_match "$1" "$g" && return 0; done <<EOF
$PGLOBS
EOF
  return 1; }
is_drift() { local g; while IFS= read -r g; do [ -n "$g" ] && dl_glob_match "$1" "$g" && return 0; done <<EOF
$DGLOBS
EOF
  return 1; }
in_allow_list() { [ -r "$DL_TASK_DIR/allow.txt" ] && tr -d '\r' < "$DL_TASK_DIR/allow.txt" | grep -Fxq -- "$1"; }
restore_from_blob() {   # rel blob [mode]
  local f="$DL_PROJECT_DIR/$1"
  [ -L "$f" ] && rm -f "$f"                                   # never write through a planted symlink
  mkdir -p "$(dirname "$f")" 2>/dev/null
  chmod u+rw "$f" 2>/dev/null
  $G cat-file blob "$2" > "$f" 2>/dev/null || return 1
  case "${3:-}" in 100755) chmod 755 "$f" ;; *) chmod 644 "$f" ;; esac
}

# 1) pinned files ------------------------------------------------------------------------------------------
PINS=$(dl_pin_list)
while IFS="$TAB" read -r p h; do
  [ -n "$p" ] || continue
  f="$DL_PROJECT_DIR/$p"
  cur=""; [ -f "$f" ] && [ ! -L "$f" ] && cur=$($G hash-object -- "$p" 2>/dev/null)
  [ "$cur" = "$h" ] && continue
  if restore_from_blob "$p" "$h"; then note PIN_RESTORED "$p" "$p is pinned and was changed or removed; it has been restored to its pinned content."
  else note PIN_CHANGED "$p" "$p is pinned and was changed; it could NOT be restored automatically."; fi
done <<EOF
$PINS
EOF
# keep the readable copy honest too
if [ -n "$PINS" ] && [ "$(cat "$DL_TASK_DIR/protected-hashes.txt" 2>/dev/null)" != "$PINS" ]; then
  printf '%s\n' "$PINS" > "$DL_TASK_DIR/protected-hashes.txt"
  note PIN_LIST_RESTORED "$DL_TASK_DIR/protected-hashes.txt" "the pin list file was edited or removed; it has been restored from git."
fi

# 2) protected files that existed at the base commit ----------------------------------------------------------
if dl_base_ok; then
  while IFS="$TAB" read -r st p; do
    [ -n "$p" ] || continue
    case "$p" in .devloop/*) continue ;; esac
    is_prot "$p" || continue
    in_allow_list "$p" && continue
    is_drift "$p" && continue
    # restore the base version (file and mode)
    mode=$($G ls-tree "$DL_BASE" -- "$p" 2>/dev/null | awk '{print $1}')
    blob=$($G rev-parse --verify --quiet "$DL_BASE:$p" 2>/dev/null)
    if [ -n "$blob" ] && restore_from_blob "$p" "$blob" "$mode"; then
      note PROTECTED_RESTORED "$p" "$p is a protected test file that existed before this run; it was changed ($st) and has been restored. Fix the code under test instead."
    else
      note PROTECTED_CHANGED "$p" "$p is a protected test file and was changed ($st); it could NOT be restored automatically."
    fi
  done <<EOF
$($G diff --name-status --no-renames "$DL_BASE" -- . ':(exclude).devloop' 2>/dev/null | awk -F'\t' '$1 != "A" {print $1 "\t" $2}')
EOF
fi

# 3) fix/finalize: new files under protected paths -------------------------------------------------------------
case "$CLASS" in fix|finalize)
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    is_prot "$p" || continue
    dl_is_pinned "$p" && continue
    in_allow_list "$p" && continue
    is_drift "$p" && continue
    grep -Fq "	NEW_PROTECTED	$p	" "$DL_TASK_DIR/integrity.log" 2>/dev/null && continue   # report once
    note NEW_PROTECTED "$p" "$p is a new file under protected test paths, created during $DL_PHASE. Only the implementer adds tests; remove it unless the plan says otherwise."
  done <<EOF
$($G ls-files --others --exclude-standard -- . ':(exclude).devloop' 2>/dev/null)
EOF
;; esac

# 4) read-only phases: undo any change to the project made by a Bash command ---------------------------------
if [ "$CLASS" = readonly ] && [ "$TOOL" = Bash ] && [ "$(dl_cfg_get hooks integrity_readonly_check)" != "false" ]; then
  snap=$(dl_kv_get "$DL_TASK_DIR/state" ro_snapshot)
  if [ -n "$snap" ] && now=$(dl_snapshot_tree) && [ -n "$now" ] && [ "$now" != "$snap" ]; then
    while IFS="$TAB" read -r st p; do
      [ -n "$p" ] || continue
      case "$st" in
        A) note READONLY_NEW_FILE "$p" "$p was created during the read-only phase '$DL_PHASE'. Delete it unless it is build/test output (then add it to drift_ignore)." ;;
        *) mode=$($G ls-tree "$snap" -- "$p" 2>/dev/null | awk '{print $1}')
           blob=$($G rev-parse --verify --quiet "$snap:$p" 2>/dev/null)
           if [ -n "$blob" ] && restore_from_blob "$p" "$blob" "$mode"; then
             note READONLY_RESTORED "$p" "$p was changed ($st) during the read-only phase '$DL_PHASE'; it has been restored. This phase must not modify the project."
           else
             note READONLY_CHANGED "$p" "$p was changed ($st) during the read-only phase '$DL_PHASE' and could not be restored."
           fi ;;
      esac
    done <<EOF
$($G diff-tree -r --name-status --no-renames "$snap" "$now" 2>/dev/null)
EOF
    dl_snapshot_tree >/dev/null 2>&1    # refresh the private index after restoring
  fi
fi

[ -n "$FOUND" ] || exit 0
msg="dev-loop integrity check after this tool call:$NL$FOUND(Logged to .devloop/$DL_TASK/integrity.log; the reviewers will see it.)"
printf '%s\n' "$msg" >&2
m=$(printf '%s' "$msg" | dl_json_quote 2>/dev/null) || exit 0
printf '{"decision":"block","reason":%s}\n' "$m"
exit 0
