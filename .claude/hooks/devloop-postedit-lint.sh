#!/usr/bin/env bash
# .claude/hooks/devloop-postedit-lint.sh — PostToolUse (Edit|Write|MultiEdit): fast, NON-BLOCKING
# lint of the edited file using commands.lint_file ({path} {dir} {name}) from .devloop/config.yaml.
#   hooks.post_edit_lint: during_run (default) | always | off     hooks.lint_extensions: "ts,tsx"
# Lint output goes back to the model as additionalContext. Always exits 0. Off switch: DEVLOOP_LINT=off.
set -u
HOOK_DIR=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
# shellcheck source=devloop-lib.sh
. "$HOOK_DIR/devloop-lib.sh" 2>/dev/null || exit 0

INPUT=$(cat)
[ "${DEVLOOP_LINT:-on}" = "off" ] && exit 0
[ -r "$DL_CONFIG" ] || exit 0
dl_json_ok || exit 0

when=$(dl_cfg_get hooks post_edit_lint)
case "${when:-during_run}" in
  off|false) exit 0 ;;
  always) ;;
  *) [ -f "$DL_ACTIVE" ] || exit 0 ;;
esac
tmpl=$(dl_cfg_get commands lint_file); [ -n "$tmpl" ] || exit 0

file=$(dl_json_get "$INPUT" tool_input.file_path); [ -n "$file" ] || exit 0
abs=$(dl_abs "$file"); rel=$(dl_rel "$abs") || exit 0
case "$rel" in .devloop/*|.claude/*) exit 0 ;; esac
[ -f "$abs" ] || exit 0

exts=$(dl_cfg_get hooks lint_extensions | tr -d ' ')
if [ -n "$exts" ]; then
  case ",$exts," in *",${rel##*.},"*) ;; *) exit 0 ;; esac
fi

shq()   { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }
subst() { local out="" rest=$1
  while :; do case "$rest" in *"$2"*) out=$out${rest%%"$2"*}$3; rest=${rest#*"$2"} ;; *) break ;; esac; done
  printf '%s' "$out$rest"; }

base=${rel##*/}
cmd=$(subst "$tmpl" "{path}" "$(shq "$rel")")
cmd=$(subst "$cmd"  "{dir}"  "$(shq "$(dirname "$rel")")")
cmd=$(subst "$cmd"  "{name}" "$(shq "${base%.*}")")

to=$(dl_cfg_get hooks lint_timeout); case "$to" in ''|*[!0-9]*) to=30 ;; esac
cd "$DL_PROJECT_DIR" 2>/dev/null || exit 0
out=$(dl_run_timeout "$to" sh -c "$cmd" 2>&1); rc=$?
[ "$rc" -eq 0 ] && exit 0

if [ "$rc" -eq 124 ]; then
  msg="dev-loop post-edit lint timed out after ${to}s on $rel (ignored)."
else
  msg=$(printf 'dev-loop post-edit lint (non-blocking) for %s exited %s. Fix if relevant to your task:\n%s' \
        "$rel" "$rc" "$(printf '%s\n' "$out" | tail -n 40)")
fi
js=$(printf '%s' "$msg" | dl_json_quote 2>/dev/null) || exit 0
printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":%s}}\n' "$js"
exit 0
