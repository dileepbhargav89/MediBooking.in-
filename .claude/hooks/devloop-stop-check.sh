#!/usr/bin/env bash
# .claude/hooks/devloop-stop-check.sh — Stop + SubagentStop.
#  SubagentStop: a dev-loop phase agent is finishing -> its artifact must exist and have a valid
#                header block; otherwise block once (JSON decision "block"; the reason goes back to that agent).
#                Helper subagents (agent_type present but not devloop-*) are ignored.
#  Stop:         the main thread is ending its turn mid-run -> block once with a reminder to
#                continue, or to mark the run paused/ended (phases gate/paused/done never block).
# Loop safety: when stop_hook_active is true we always allow. Fails open.
set -u
HOOK_DIR=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
# shellcheck source=devloop-lib.sh
. "$HOOK_DIR/devloop-lib.sh" 2>/dev/null || exit 0

INPUT=$(cat)
[ "${DEVLOOP_GUARD:-on}" = "off" ] && exit 0
[ -f "$DL_ACTIVE" ] || exit 0
dl_json_ok || exit 0
dl_load_state || exit 0
[ "$(dl_json_get "$INPUT" stop_hook_active)" = "true" ] && exit 0

check_subagent() {
  local phase f p status v problems=""
  dl_detect_agent "$INPUT"
  if [ -n "$DL_AGENT_TYPE" ] && [ -z "$DL_CALLER_ROLE" ]; then exit 0; fi
  phase=$DL_PHASE
  [ -n "$DL_CALLER_ROLE" ] && phase=$(dl_phase_for_role "$DL_CALLER_ROLE")
  lens=""
  case "$DL_CALLER_ROLE" in review-*) lens=${DL_CALLER_ROLE#review-} ;; esac
  case "$phase" in
    investigate) f=investigation.md ;; plan) f=plan.md ;; implement|fix) f=fix-log.md ;;
    test) f=test-report.md ;; verify) f=browser-report.md ;; finalize) f=summary.md ;;
    plan-review|review)
      # Four lens reviewers run in parallel; without agent_type we cannot tell which file is theirs.
      [ -n "$lens" ] || exit 0
      if [ "$phase" = plan-review ]; then f="plan-review-$lens.md"; else f="review-$lens.md"; fi ;;
    *) exit 0 ;;
  esac
  p="$DL_TASK_DIR/$f"
  tpl=$f
  case "$f" in plan-review-*) tpl=plan-review.md ;; review-*) tpl=review.md ;; esac
  if [ ! -s "$p" ]; then
    dl_stop_block "$(printf 'dev-loop: you are the %s agent for task %s, but .devloop/%s/%s is missing or empty. Write it from .claude/skills/dev-loop/templates/%s before finishing.' \
      "$phase" "$DL_TASK" "$DL_TASK" "$f" "$tpl")"
  fi
  need() { v=$(dl_header_get "$p" "$1")
    printf '%s\n' "$v" | grep -Eqx "$2" || problems="$problems
- header $1 is '${v:-<missing>}' (expected: $2)"; }

  [ -n "$DL_MODE" ] && need MODE "$DL_MODE"
  case "$phase" in
    investigate) need STATUS 'COMPLETE|BLOCKED' ;;
    plan)        need STATUS 'COMPLETE|BLOCKED'; need GATE 'PENDING|APPROVED|REJECTED' ;;
    implement|fix)
      need STATUS 'IN_PROGRESS|RESOLVED|EXHAUSTED|BLOCKED'; need ITERATION "$DL_ITER"
      grep -Eq "^## Iteration ${DL_ITER}([^0-9]|\$)" "$p" || problems="$problems
- no '## Iteration $DL_ITER' entry (append one; do not edit earlier entries)" ;;
    test|verify) need STATUS 'COMPLETE|BLOCKED'; need ITERATION "$DL_ITER" ;;
    plan-review|review) need STATUS 'COMPLETE|BLOCKED'; need LENS "$lens" ;;
    finalize)    need STATUS 'COMPLETE|INCOMPLETE|BLOCKED' ;;
  esac
  status=$(dl_header_get "$p" STATUS)
  if [ "$status" = COMPLETE ]; then
    case "$phase" in
      test|verify) need VERDICT 'PASS|FAIL' ;;
      plan-review) need VERDICT 'PASS|FAIL'; need BLOCKING_ISSUES '[0-9]+' ;;
      review)
        need VERDICT 'PASS|FAIL'; need BLOCKING_ISSUES '[0-9]+'; need ITERATION "$DL_ITER"
        if [ "$lens" = logic ]; then need TAMPER 'CLEAN|SUSPICIOUS|NOT_RUN'; else need TAMPER 'N/A|CLEAN|SUSPICIOUS|NOT_RUN'; fi ;;
    esac
  fi
  if [ "$status" = BLOCKED ]; then
    v=$(dl_header_get "$p" BLOCKER)
    case "$v" in ''|none|None|NONE) problems="$problems
- STATUS is BLOCKED but BLOCKER is empty; give a one-line reason" ;; esac
  fi
  if [ -n "$problems" ]; then
    dl_stop_block "$(printf 'dev-loop: .devloop/%s/%s has an invalid header block:%s\nFix the header (values must be literal, no <placeholders>) and finish again.' \
      "$DL_TASK" "$f" "$problems")"
  fi
  exit 0
}

check_main() {
  [ "$(dl_cfg_get hooks stop_guard)" = "false" ] && exit 0
  case "$DL_PHASE" in gate|paused|done|'') exit 0 ;; esac
  dl_stop_block "dev-loop run '$DL_TASK' is still in phase '$DL_PHASE'. If the loop should continue, continue it. If you are stopping on purpose (waiting for the user, blocked, cap reached), first run: bash .claude/hooks/devloop-state.sh phase paused   (or: ... end <outcome>). This reminder fires once per stop."
}

case "$(dl_json_get "$INPUT" hook_event_name)" in
  SubagentStop) check_subagent ;;
  Stop)         check_main ;;
esac
exit 0
