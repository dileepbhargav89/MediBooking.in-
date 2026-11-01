#!/usr/bin/env bash
# .claude/hooks/devloop-run.sh — the ONE way agents and the orchestrator run project commands.
# Reads the command from .devloop/config.yaml, fills placeholders, applies the configured timeout,
# writes the full output to a log file and prints only a short, machine-readable summary.
# Keeps test output out of agent context, gives every phase the same timeouts, and is exempted by the guard.
#
#   devloop-run.sh <step> [--path P] [--label L]
#       step: setup | build | typecheck | lint | test | test_single | e2e
#       --path fills {path} {dir} {name} (required for test_single)
#       --label is appended to the log name (default: iteration number)
#   devloop-run.sh env_up      start commands.env_up in the background, wait for browser.base_url
#   devloop-run.sh env_down    run commands.env_down, or stop the env_up process
#   devloop-run.sh failhash <report.md>...   hash of the sorted "## Failing IDs" lists (or "none")
#   devloop-run.sh diffhash    hash of the current change vs the run's base (tracked + untracked)
#
# Output (stdout):
#   STEP: <step>   COMMAND: <cmd>   EXIT: <n>|SKIPPED|TIMEOUT|NO_TESTS_RAN   DURATION: <s>
#   TESTS_RAN: <n>|unknown   LOG: <path>   LOAD_ERROR: yes|no (import/compile/collection error)
#   then the last 40 lines of output
# Exit: the command's exit code · 3 SKIPPED (not configured — never a pass) · 124 TIMEOUT
#       5 NO_TESTS_RAN (test / test_single executed zero tests) · 6 env not ready · 2 usage error
#
# Long steps: the Bash tool stops a call after 10 minutes at most. If timeouts.<step> exceeds 540,
# start this script with run_in_background, then poll: the file <LOG>.exit appears when it finishes.
set -u
HOOK_DIR=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
# shellcheck source=devloop-lib.sh
. "$HOOK_DIR/devloop-lib.sh" 2>/dev/null || { echo "devloop-run: devloop-lib.sh missing" >&2; exit 2; }

usage() { sed -n '2,24p' "$0" >&2; exit 2; }
STEP=${1:-}; [ -n "$STEP" ] || usage; shift

if dl_load_state; then LOGDIR="$DL_TASK_DIR/history"; LABEL_DEFAULT="i$DL_ITER"
else LOGDIR="$DL_DIR/_runs"; LABEL_DEFAULT=$(date +%Y%m%d-%H%M%S); fi
mkdir -p "$LOGDIR" 2>/dev/null || { echo "devloop-run: cannot create $LOGDIR" >&2; exit 2; }
cd "$DL_PROJECT_DIR" 2>/dev/null || { echo "devloop-run: cannot cd to $DL_PROJECT_DIR" >&2; exit 2; }

# ---- helper subcommands ---------------------------------------------------------------------
if [ "$STEP" = failhash ]; then
  [ $# -gt 0 ] || usage
  for f in "$@"; do
    [ -r "$f" ] || { echo "devloop-run failhash: cannot read $f" >&2; exit 2; }
    grep -q '^## Failing IDs[[:space:]]*$' "$f" || { echo "devloop-run failhash: no '## Failing IDs' section in $f" >&2; exit 2; }
  done
  ids=$(for f in "$@"; do
          awk '/^## Failing IDs[[:space:]]*$/ {on=1; next} /^## / {on=0}
               on && /<!--/ {c=1} c {if (/-->/) c=0; next} on' "$f" |
            sed -e 's/^[[:space:]]*[-*][[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^`//' -e 's/`$//' \
                -e '/^$/d' -e '/^none$/d' -e '/^{{/d'
        done | LC_ALL=C sort -u)
  if [ -z "$ids" ]; then echo none; else printf '%s\n' "$ids" | git hash-object --stdin | cut -c1-12; fi
  exit 0
fi
if [ "$STEP" = diffhash ]; then
  dl_load_state || { echo "devloop-run: no active run" >&2; exit 2; }
  # Fail closed: without a usable base commit every diff would hash the same and stale reviews would look current.
  dl_base_ok || { echo "devloop-run diffhash: no usable base commit ('${DL_BASE:-none}'); refusing to hash" >&2; echo ERROR; exit 2; }
  set -- . ':(exclude).devloop'
  ign=$(dl_cfg_list drift_ignore)
  if [ -n "$ign" ]; then
    while IFS= read -r g; do [ -n "$g" ] && set -- "$@" ":(exclude)$g"; done <<EOF
$ign
EOF
  fi
  { git diff --no-color "$DL_BASE" -- "$@"
    git ls-files -o --exclude-standard -z -- "$@" | xargs -0 git hash-object 2>/dev/null
  } | git hash-object --stdin | cut -c1-12
  exit 0
fi

PATH_ARG=""; LABEL=$LABEL_DEFAULT
while [ $# -gt 0 ]; do
  case "$1" in
    --path)  [ $# -ge 2 ] || usage; PATH_ARG=$2; shift 2 ;;
    --label) [ $# -ge 2 ] || usage; LABEL=$2; shift 2 ;;
    *) usage ;;
  esac
done
case "$LABEL" in *[!A-Za-z0-9._-]*) echo "devloop-run: bad label" >&2; exit 2 ;; esac

case "$STEP" in
  setup|build|typecheck|lint|test|test_single|e2e|env_up|env_down) ;;
  *) echo "devloop-run: unknown step '$STEP'" >&2; usage ;;
esac

CMD=$(dl_cfg_get commands "$STEP")
TO=$(dl_cfg_get timeouts "$STEP"); case "$TO" in ''|*[!0-9]*) TO=540 ;; esac
LOG="$LOGDIR/$STEP-$LABEL.log"
[ "$STEP" = test_single ] && [ -n "$PATH_ARG" ] && LOG="$LOGDIR/$STEP-$LABEL-$(printf '%s' "$PATH_ARG" | tr -c 'A-Za-z0-9._-' '_').log"
rm -f "$LOG.exit"

shq()   { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }
subst() { local out="" rest=$1
  while :; do case "$rest" in *"$2"*) out=$out${rest%%"$2"*}$3; rest=${rest#*"$2"} ;; *) break ;; esac; done
  printf '%s' "$out$rest"; }

summary() {  # exit_label tests_ran duration
  echo "STEP: $STEP"
  echo "COMMAND: ${CMD:-<not configured>}"
  echo "EXIT: $1"
  echo "DURATION: ${3:-0}s"
  echo "TESTS_RAN: $2"
  echo "LOG: ${LOG#"$DL_PROJECT_DIR"/}"
}

# ---- env_up / env_down ------------------------------------------------------------------------
PIDFILE="$LOGDIR/../env.pid"
if [ "$STEP" = env_up ]; then
  [ -n "$CMD" ] || { summary SKIPPED - 0; echo SKIPPED > "$LOG.exit"; exit 3; }
  url=$(dl_cfg_get browser base_url)
  wait_s=$(dl_cfg_get browser ready_timeout); case "$wait_s" in ''|*[!0-9]*) wait_s=90 ;; esac
  if [ -r "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then echo "env already up (pid $(cat "$PIDFILE"))"
  else
    if dl_have setsid; then setsid sh -c "$CMD" > "$LOG" 2>&1 < /dev/null &   # own process group, so env_down stops children
    elif dl_have perl; then perl -e 'setpgrp(0, 0); exec @ARGV' sh -c "$CMD" > "$LOG" 2>&1 < /dev/null &
    else nohup sh -c "exec $CMD" > "$LOG" 2>&1 < /dev/null & fi
    echo $! > "$PIDFILE"
  fi
  if [ -n "$url" ] && dl_have curl; then
    i=0
    while [ $i -lt "$wait_s" ]; do
      curl -s -o /dev/null --max-time 2 "$url" && { summary 0 - "$i"; echo "READY: $url"; echo 0 > "$LOG.exit"; exit 0; }
      kill -0 "$(cat "$PIDFILE")" 2>/dev/null || break
      sleep 1; i=$((i + 1))
    done
    summary "NOT_READY" - "$i"; echo "env did not answer at $url"; tail -n 40 "$LOG"; echo 6 > "$LOG.exit"; exit 6
  fi
  summary 0 - 0; echo "started (no browser.base_url or curl to wait on)"; echo 0 > "$LOG.exit"; exit 0
fi
if [ "$STEP" = env_down ]; then
  if [ -n "$CMD" ]; then sh -c "$CMD" > "$LOG" 2>&1; rc=$?
  elif [ -r "$PIDFILE" ]; then
    pid=$(cat "$PIDFILE"); kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null; rc=0
  else rc=0; fi
  rm -f "$PIDFILE"; summary "$rc" - 0; exit "$rc"
fi

# ---- normal steps -------------------------------------------------------------------------------
if [ -z "$CMD" ]; then
  summary SKIPPED - 0; echo SKIPPED > "$LOG.exit"
  echo "(not configured — record this step under 'Not verified'; it never counts as passing)"
  exit 3
fi
if [ "$STEP" = test_single ]; then
  [ -n "$PATH_ARG" ] || { echo "devloop-run: test_single needs --path" >&2; exit 2; }
fi
if [ -n "$PATH_ARG" ]; then
  rp=$(dl_rel "$(dl_abs "$PATH_ARG")") || rp=$PATH_ARG
  base=${rp##*/}
  CMD=$(subst "$CMD" "{path}" "$(shq "$rp")")
  CMD=$(subst "$CMD" "{dir}"  "$(shq "$(dirname "$rp")")")
  CMD=$(subst "$CMD" "{name}" "$(shq "${base%.*}")")
fi

case "$(dl_unquote_cmd "$CMD")" in
  *';'*) echo "WARNING: ';' in commands.$STEP hides failures of the earlier parts (only the last exit code counts). Use && or a script." >&2 ;;
esac

# If the runner itself is killed (Ctrl-C, Bash tool timeout), record it and stop the test processes.
kill_tree() {
  local c
  if dl_have pgrep; then for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; fi
  kill -TERM "$1" 2>/dev/null
}
cpid=""
trap 'echo KILLED > "$LOG.exit"; [ -n "$cpid" ] && kill_tree "$cpid"; echo "EXIT: KILLED"; exit 143' TERM INT HUP

start=$(date +%s)
dl_run_timeout "$TO" sh -c "$CMD" > "$LOG" 2>&1 < /dev/null &
cpid=$!
wait "$cpid"
rc=$?
trap - TERM INT HUP
dur=$(( $(date +%s) - start ))

# Tests-executed heuristic: per summary line count the tests it reports, then take the MAX over lines
# (runners like Maven print per-class lines plus a total). Covers pytest, jest/vitest, maven/gradle,
# dotnet, mocha, rspec, cargo. Unknown formats (e.g. go without -v) give "unknown", never a false 0.
ran=$(awk '
  /Test Suites:|Test Files / { next }      # suite/file counts are not test counts (jest, vitest)
  { n = -1; line = $0
    if (match(line, /[0-9]+ total/))               n = substr(line, RSTART, RLENGTH) + 0
    else if (match(line, /Tests run: [0-9]+/))     n = substr(line, RSTART + 11, RLENGTH - 11) + 0
    else if (match(line, /Total tests: [0-9]+/))   n = substr(line, RSTART + 13, RLENGTH - 13) + 0
    else if (match(line, /Total: +[0-9]+/))        { t = substr(line, RSTART, RLENGTH); sub(/[^0-9]+/, "", t); n = t + 0 }
    else if (match(line, /[0-9]+ tests? completed/)) n = substr(line, RSTART, RLENGTH) + 0
    else if (match(line, /[0-9]+ examples?/))      n = substr(line, RSTART, RLENGTH) + 0
    else {
      s = 0; hit = 0
      while (match(line, /[0-9]+ (passed|failed|passing|failing)/)) { s += substr(line, RSTART, RLENGTH) + 0; hit = 1; line = substr(line, RSTART + RLENGTH) }
      if (hit) n = s
    }
    if (n >= 0) { seen = 1; if (n > max) max = n }
    if ($0 ~ /^[ \t]*--- (PASS|FAIL): /) go++
  }
  END { if (seen) print max + 0; else if (go) print go; else print "unknown" }' "$LOG" 2>/dev/null)
if [ "$ran" = unknown ] || [ "$ran" = 0 ]; then
  if grep -Eqi 'no tests ran|no tests found|no tests to run|Tests run: 0,|collected 0 items|No test files found|0 examples|^0 passing|No test is available|No tests matching|No tests were executed|NO-SOURCE' "$LOG" 2>/dev/null; then ran=0
  # pytest: a summary with only skipped/deselected (no passed/failed)
  elif grep -Eq '^=+ [^=]* in [0-9.]+s' "$LOG" 2>/dev/null && ! grep -E '^=+ [^=]* in [0-9.]+s' "$LOG" | grep -Eq 'passed|failed'; then ran=0
  # go: every package reported [no test files] and none ran
  elif grep -q '\[no test files\]' "$LOG" 2>/dev/null && ! grep -Eq '^(ok|FAIL|--- )' "$LOG"; then ran=0
  fi
fi

# Did the code even load? (a "failing" test that never ran its assertion proves nothing)
load_err=no
if [ "$rc" -ne 0 ] && grep -Eq 'ERROR collecting|ImportError while importing test module|Test suite failed to run|Cannot find module|Failed to load url|Cannot find package|error TS[0-9]+|COMPILATION ERROR|cannot find symbol|Unresolved reference|error CS[0-9]+|\[build failed\]|setup failed|undefined: [A-Za-z_]|error\[E[0-9]+\]|LoadError|cannot load such file' "$LOG" 2>/dev/null; then
  load_err=yes
fi

label=$rc
[ "$rc" -eq 124 ] && label=TIMEOUT
if { [ "$STEP" = test ] || [ "$STEP" = test_single ] || [ "$STEP" = e2e ]; } && [ "$ran" = 0 ]; then
  label=NO_TESTS_RAN; rc=5
fi
echo "$rc" > "$LOG.exit"
summary "$label" "$ran" "$dur"
echo "LOAD_ERROR: $load_err"
echo "--- last 40 lines (each cut to 400 chars) ---"
tail -n 40 "$LOG" | cut -c1-400 | tail -c 8000
exit "$rc"
