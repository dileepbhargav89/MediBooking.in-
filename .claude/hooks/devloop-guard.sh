#!/usr/bin/env bash
# .claude/hooks/devloop-guard.sh — PreToolUse guard for dev-loop runs.
# Hooked on matcher "Edit|Write|MultiEdit|NotebookEdit" and on matcher "Bash".
# Blocks with a JSON "deny" decision on stdout and exit 0 (see dl_block). Any crash is therefore
# a non-blocking error and can't lock up the session.
#
# WHO IS CALLING? Claude Code does not reliably tell a hook which subagent made a tool call.
# The orchestrator therefore records the current phase/role in .devloop/ACTIVE (via devloop-state.sh)
# and this guard enforces the policy for that phase. If the hook input includes agent_id/agent_type
# (newer versions) and agent_type is "devloop-<role>", that role's policy applies instead.
#
# Policy (class comes from the caller role if known, else from the phase):
#   readonly  (investigate, plan, gate, test, review): Edit/Write only under .devloop/<task>/;
#             Bash: no repo writes, no dependency changes, no snapshot updates (heuristic)
#   implement: may not MODIFY existing protected files (may ADD new ones unless disabled;
#             human-approved exceptions in .devloop/<task>/allow.txt)
#   fix:       may not touch protected paths at all; no snapshot updates
#   finalize:  may not touch protected paths; git commit allowed
#   idle      (paused, done): no enforcement
# While a run is active, nobody may Edit/Write dev-loop control files, and git history/worktree
# operations that would invalidate base-commit diffs are blocked.
# Fails open (with a warning) when config/state/tools are missing. Escape hatch: DEVLOOP_GUARD=off.
set -u

HOOK_DIR=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
# shellcheck source=devloop-lib.sh
if ! . "$HOOK_DIR/devloop-lib.sh" 2>/dev/null; then
  echo "dev-loop guard: devloop-lib.sh missing; guard disabled" >&2; exit 0
fi

INPUT=$(cat)
[ "${DEVLOOP_GUARD:-on}" = "off" ] && exit 0
[ -f "$DL_ACTIVE" ] || exit 0                       # no active run: near-zero overhead

dl_json_ok   || dl_allow_warn "jq and python3 are both missing; guard disabled for this call"
dl_load_state || dl_allow_warn ".devloop/ACTIVE is malformed; guard disabled (fix it or run: bash .claude/hooks/devloop-state.sh end)"
if dl_is_stale; then
  dl_allow_warn "run '$DL_TASK' looks stale (no state update in $(dl_stale_hours)h); guard disabled. Resume it (/dev-loop --resume $DL_TASK) or end it."
fi
dl_detect_agent "$INPUT"

CLASS=$(dl_class_for_phase "$DL_PHASE")
if [ -n "$DL_CALLER_ROLE" ]; then
  rc=$(dl_class_for_role "$DL_CALLER_ROLE"); [ -n "$rc" ] && CLASS=$rc
fi
case "$CLASS" in
  idle) exit 0 ;;
  unknown) dl_allow_warn "unknown phase '$DL_PHASE' in .devloop/ACTIVE; guard disabled" ;;
esac
TASKP=$(dl_lc "$DL_TASK")   # task id as it appears in (possibly lower-cased) relative paths
WHO="phase=$DL_PHASE${DL_CALLER_ROLE:+, caller=devloop-$DL_CALLER_ROLE}"
W='(^|[;&|(`'"'"'"[:space:]])'      # portable "start of command word" boundary for grep -E (quotes too: bash -c 'git ...')

is_control_rel() {
  case "$1" in
    .devloop/ACTIVE|.devloop/active|.devloop/config.yaml|.devloop/config.yml) return 0 ;;
    .devloop/*/state|.devloop/*/protected.txt|.devloop/*/allow.txt|.devloop/*/protected-hashes.txt) return 0 ;;
    .claude/hooks/*|.claude/settings.json|.claude/settings.local.json) return 0 ;;
    .claude/skills/dev-loop/*|.claude/agents/devloop-*) return 0 ;;
  esac
  return 1
}
in_allow_list() { [ -r "$DL_TASK_DIR/allow.txt" ] && tr -d '\r' < "$DL_TASK_DIR/allow.txt" | grep -Fxq -- "$1"; }

check_edit() {
  local file abs rel
  file=$(dl_json_get "$INPUT" tool_input.file_path)
  [ -n "$file" ] || file=$(dl_json_get "$INPUT" tool_input.notebook_path)
  [ -n "$file" ] || exit 0
  abs=$(dl_abs "$file")
  rel=$(dl_rel "$abs") || exit 0                   # outside the project (scratch dirs etc.)
  if is_control_rel "$rel"; then
    dl_block "$rel is a dev-loop control file and cannot be edited during run '$DL_TASK' ($WHO). The orchestrator changes run state only via: bash .claude/hooks/devloop-state.sh <command>"
  fi
  case "$rel" in
    .devloop/"$TASKP"/history/*) [ "$DL_IS_SUBAGENT" = 1 ] && dl_block "$rel: .devloop/$DL_TASK/history/ is written only by the orchestrator"; exit 0 ;;
    .devloop/"$TASKP"/*) exit 0 ;;
    .devloop/*) dl_block "$rel belongs to another dev-loop task; write only under .devloop/$DL_TASK/" ;;
  esac
  if [ "$CLASS" != readonly ] && dl_is_pinned "$rel" && ! in_allow_list "$rel"; then
    dl_block "$rel is pinned for this run (repro test / new test written earlier). Tests may not change after they are pinned. If it is genuinely wrong, set STATUS: BLOCKED with a one-line BLOCKER and stop."
  fi
  case "$CLASS" in
    readonly)
      dl_block "'$DL_PHASE' is a read-only phase ($WHO): only .devloop/$DL_TASK/ may be written, not $rel. Describe proposed changes in your artifact instead." ;;
    implement)
      if dl_is_protected "$rel" && ! in_allow_list "$rel"; then
        if [ -e "$abs" ] && dl_in_base "$rel"; then
          dl_block "$rel is protected (protected_paths). The implementer may ADD new files there but not modify existing ones. If the plan truly requires this, stop with STATUS: BLOCKED in fix-log.md; a human can approve it (devloop-state.sh allow $rel)."
        elif [ "$(dl_cfg_get hooks allow_new_protected_files)" = "false" ]; then
          dl_block "$rel is under protected_paths and hooks.allow_new_protected_files is false."
        fi
      fi ;;
    fix|finalize)
      if dl_is_protected "$rel"; then
        dl_block "$rel is protected ($WHO). Fix the code under test, not the tests or test config. If you believe the test is wrong, explain in fix-log.md, set STATUS: BLOCKED, and stop."
      fi ;;
  esac
  exit 0
}

# Strip quoted strings so `grep 'x > 0'` or `echo "a => b"` isn't read as a redirect.
dl_unquote() { printf '%s' "$1" | sed -E "s/'[^']*'/''/g; s/\"[^\"]*\"/\"\"/g"; }

# The command with heredoc BODIES, shell comments and $((arithmetic)) removed (the text that is actually
# parsed as shell). Report bodies like "> **Note**" or "a -> b" are data, not redirects.
DL_AWK_CLEAN='BEGIN { RS = "\001" }
function skipbody(   k, ln, cmp) {
  for (k = 1; k <= np; k++) {
    while (i <= n) {
      e = index(substr(s, i), "\n"); if (e == 0) { ln = substr(s, i); i = n + 1 } else { ln = substr(s, i, e - 1); i = i + e }
      cmp = ln; if (pstrip[k]) sub(/^\t+/, "", cmp)
      if (cmp == pd[k]) break
    }
  }
  np = 0
}
{ s = $0; n = length(s); out = ""; q = ""; i = 1; np = 0
  while (i <= n) {
    c = substr(s, i, 1)
    if (q != "") { out = out c; if (c == q) q = ""; else if (c == "\\" && q == "\"") { out = out substr(s, i + 1, 1); i++ } i++; continue }
    if (c == "\047" || c == "\"") { q = c; out = out c; i++; continue }
    if (c == "\\") { out = out substr(s, i, 2); i += 2; continue }
    if (c == "\n") { out = out c; i++; if (np > 0) skipbody(); continue }
    if (substr(s, i, 3) == "$((") { d = 1; j = i + 3
      while (j <= n && d > 0) { if (substr(s, j, 2) == "((") { d++; j += 2; continue } if (substr(s, j, 2) == "))") { d--; j += 2; continue } j++ }
      out = out "0"; i = j; continue }
    if (c == "#" && (i == 1 || substr(s, i - 1, 1) ~ /[ \t\n;&|]/)) { while (i <= n && substr(s, i, 1) != "\n") i++; continue }
    if (substr(s, i, 2) == "<<" && substr(s, i, 3) != "<<<") {
      j = i + 2; st = 0; if (substr(s, j, 1) == "-") { st = 1; j++ }
      while (substr(s, j, 1) == " " || substr(s, j, 1) == "\t") j++
      w = ""; d = substr(s, j, 1)
      if (d == "\047" || d == "\"") { k = index(substr(s, j + 1), d); w = substr(s, j + 1, k - 1); j = j + k + 1 }
      else { while (j <= n && substr(s, j, 1) !~ /[ \t\n;&|<>()]/) { w = w substr(s, j, 1); j++ } }
      out = out substr(s, i, j - i); i = j
      if (w != "") { np++; pd[np] = w; pstrip[np] = st }
      continue
    }
    out = out c; i++
  }
  printf "%s", out
}'
dl_clean_cmd() { printf '%s' "$1" | awk "$DL_AWK_CLEAN"; }

# Redirect targets of a command, quote-aware: `grep 'a > b'` has none; `echo x > "$P/f"` has "$P/f";
# `2>&1` is not a target. Recurses into `bash -c '...'` / `sh -c "..."` / eval strings.
DL_AWK_REDIR='BEGIN { RS = "\001" }
{ s = $0; n = length(s); q = ""; i = 1
  while (i <= n) {
    c = substr(s, i, 1)
    if (q != "") { if (c == q) q = ""; else if (c == "\\" && q == "\"") i++; i++; continue }
    if (c == "\047" || c == "\"") { q = c; i++; continue }
    if (c == "\\") { i += 2; continue }
    if (c == ">") {
      j = i + 1; d = substr(s, j, 1)
      if (d == ">" || d == "|") { j++; d = substr(s, j, 1) }
      if (d == "&") { i = j + 1; continue }
      while (substr(s, j, 1) == " " || substr(s, j, 1) == "\t") j++
      t = ""
      while (j <= n) {
        d = substr(s, j, 1)
        if (d == "\047" || d == "\"") { k = index(substr(s, j + 1), d); if (k == 0) { t = t substr(s, j + 1); j = n + 1; break }
                                       t = t substr(s, j + 1, k - 1); j = j + k + 1; continue }
        if (d ~ /[ \t\n;&|<>()]/) break
        t = t d; j++
      }
      if (t != "") print t
      i = j; continue
    }
    i++
  }
}'
redirect_targets() {
  local inner
  dl_clean_cmd "$1" | awk "$DL_AWK_REDIR"
  printf '%s\n' "$1" | grep -oE "(${W}(ba|z|da|k)?sh|${W}eval)[[:space:]]+(-[a-z]*c[[:space:]]+)?('[^']*'|\"[^\"]*\")" |
    sed -E "s/^[^'\"]*['\"]//; s/['\"]\$//" | while IFS= read -r inner; do
      [ -n "$inner" ] && printf '%s' "$inner" | awk "$DL_AWK_REDIR"
    done
  # awk programs: only `print > "file"` / `printf ... >> "file"` write files (a bare `>` is a comparison)
  printf '%s\n' "$1" | grep -oE "${W}[gm]?awk[[:space:]][^|;&]*" | grep -oE "printf?[^;}]*>>?[[:space:]]*\"[^\"]+\"" |
    sed -E 's/.*>>?[[:space:]]*"([^"]+)"$/\1/'
}

redirect_ok() {   # is a shell redirection target acceptable in a read-only phase?
  local t a r
  t=$(printf '%s' "$1" | tr -d "\"'")
  case "$t" in
    /dev/null|/dev/stdout|/dev/stderr|/dev/fd/*) return 0 ;;
    '$TMPDIR'/*|'${TMPDIR}'/*) case "$t" in *..*) return 1 ;; *) return 0 ;; esac ;;
    '$CLAUDE_PROJECT_DIR/'*|'${CLAUDE_PROJECT_DIR}/'*) t="$DL_PROJECT_DIR/${t#*/}" ;;
    /tmp/*'$'*|/tmp/*'`'*) case "$t" in *..*) return 1 ;; *) return 0 ;; esac ;;
    *'$'*|*'`'*) return 1 ;;
  esac
  a=$(dl_abs "$t")                                  # normalises /tmp/../x and ./.devloop/T1/../../x
  # Inside the project (checked first: a project may itself live under a temp dir): only .devloop/<task>/.
  if r=$(dl_rel "$a"); then
    case "$r" in
      .devloop/"$TASKP"/state|.devloop/"$TASKP"/protected.txt|.devloop/"$TASKP"/allow.txt|.devloop/"$TASKP"/protected-hashes.txt) return 1 ;;
      .devloop/"$TASKP"/*) return 0 ;;
    esac
    return 1
  fi
  case "$a" in /tmp/*|/private/tmp/*|/var/tmp/*) return 0 ;; esac
  if [ -n "${TMPDIR:-}" ]; then case "$a" in "$(dl_abs "$TMPDIR")"/*) return 0 ;; esac; fi
  return 1
}

# tokens on stdin -> project-relative paths (tokens with a '/' or naming an existing project file)
paths_of() {
  tr "\"'\`(),=" '\n' | tr ' \t' '\n' | while IFS= read -r t; do
    case "$t" in ''|-*|*'$'*|http://*|https://*) continue ;; esac
    case "$t" in */*) ;; *) [ -e "$DL_PROJECT_DIR/$t" ] || continue ;; esac
    dl_rel "$(dl_abs "$t")" 2>/dev/null
  done
}

# The files a command WRITES, as project-relative paths (one per line). Per segment (split on ; & | and
# newlines): redirect targets; everything after tee; the destination of cp/ln/install/rsync; every
# argument of rm/mv/truncate/sed -i/...; dd of=; any path inside inline interpreter code that writes.
cmd_write_targets() {
  local raw=$1 seg first rest
  { redirect_targets "$raw" | sed -e "s#^\\\$CLAUDE_PROJECT_DIR/#$DL_PROJECT_DIR/#" -e "s#^\\\${CLAUDE_PROJECT_DIR}/#$DL_PROJECT_DIR/#"
    { dl_clean_cmd "$raw"; echo; } | tr ';&|' '\n\n\n' | while IFS= read -r seg; do
      seg=$(printf '%s' "$seg" | sed -E 's/^[[:space:]]*\(?[[:space:]]*(([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*|sudo( -[a-zA-Z]+)*|env|command( -p)?|exec|nohup|nice( -n -?[0-9]+)?|timeout( -[a-z]+)* [0-9.]+[smhd]?|stdbuf( -[a-zA-Z0-9]+)*|xargs( -[a-zA-Z0-9{}]+)*|-exec|-execdir)[[:space:]]+)*//')
      first=${seg%%[[:space:]]*}; rest=${seg#"$first"}
      first=${first##*/}; first=${first#\\}       # /usr/bin/sed, \sed -> sed
      case "$first" in
        tee) printf '%s\n' "$rest" ;;
        cp|ln|install|rsync) printf '%s\n' "$rest" | tr ' \t' '\n' | grep -v '^-' | grep -v '^$' | tail -n 1 ;;
        rm|rmdir|mv|truncate|shred|unlink|chmod|chown|patch) printf '%s\n' "$rest" ;;
        dd) printf '%s\n' "$rest" | tr ' \t' '\n' | sed -n 's/^of=//p' ;;
        sed|gsed|perl|ruby) printf '%s\n' "$rest" | grep -Eq '(^|[[:space:]])(-[a-zA-Z]*i|--in-place)' && printf '%s\n' "$rest" ;;
        find) printf '%s\n' "$rest" | grep -Eq -- '-exec(dir)?[[:space:]]+[^;]*(sed|perl|cp|mv|rm|tee|truncate|dd)[[:space:]]|-delete' && printf '%s\n' "$rest" ;;
        tar|unzip|patch|cpio) printf '%s\n' "$rest" ;;
        python|python3|node|deno|bun|php|ruby)
          printf '%s' "$seg" | grep -Eq "open\(|write_text|write_bytes|writeFile|appendFile|createWriteStream|copyFile|unlink|rmtree|os\.remove|os\.rename|os\.system|subprocess|shutil\.|fs\.(rm|rename|copy)|truncate|File\.write|file_put_contents" &&
            printf '%s\n' "$rest" ;;
      esac
    done
    # (python3 - <<EOF / node <<EOF scripts are not pre-judged here: their paths can't be told apart from
    #  reads. devloop-integrity.sh checks the result after the call and restores protected/pinned files.)
  } | paths_of | sort -u
}

cmd_mutates() {   # heuristic; sets MUT_WHY
  local c bad
  c=$(dl_unquote "$(dl_clean_cmd "$1")")
  if printf '%s' "$c" | grep -Eq "${W}(rm|rmdir|mv|cp|truncate|ln|chmod|chown|patch|dd|unlink|shred|install|rsync)[[:space:]]"; then
    MUT_WHY="file-mutating command (rm/mv/cp/…)"; return 0; fi
  if printf '%s' "$c" | grep -Eq "${W}(sed|perl|ruby)[[:space:]]+(-[A-Za-z]*i|--in-place)|${W}tee[[:space:]]|[[:space:]]-delete([[:space:]]|\$)"; then
    MUT_WHY="in-place edit / tee / find -delete"; return 0; fi
  if printf '%s' "$c" | grep -Eq "${W}(tar[[:space:]]+-?[a-zA-Z]*x|unzip|patch|cpio)[[:space:]]|${W}find[[:space:]].*(-exec|-delete)|${W}xargs[[:space:]]"; then
    MUT_WHY="archive/patch/find -exec/xargs command"; return 0; fi
  if printf '%s' "$1" | grep -Eq "${W}(python3?|node|ruby|perl|php|deno|bun)([[:space:]]+-[A-Za-z]*)*([[:space:]]+-)?[[:space:]]*<<" &&
     printf '%s' "$1" | grep -Eq "open\(|write_text|write_bytes|writeFile|appendFile|createWriteStream|copyFile|unlink|rmtree|os\.remove|os\.rename|os\.system|subprocess|shutil\.|truncate|File\.write|file_put_contents"; then
    MUT_WHY="script that writes files"; return 0; fi
  # inline interpreter code that writes or deletes files (checked on the raw text: the code is quoted)
  if printf '%s' "$1" | grep -Eq "${W}(python3?|node|perl|ruby|php|deno|bun)([[:space:]]+-[A-Za-z]+)*[[:space:]]+(-[A-Za-z]*[ce]|--eval)" &&
     printf '%s' "$1" | grep -Eq "open\(|write_text|write_bytes|writeFile|appendFile|createWriteStream|copyFile|unlink|rmtree|os\.remove|os\.rename|os\.system|subprocess|shutil\.|fs\.(rm|rename|copy)|truncate|File\.write|IO\.write|file_put_contents"; then
    MUT_WHY="inline script that writes files"; return 0; fi
  bad=$(redirect_targets "$1" | while IFS= read -r t; do redirect_ok "$t" || { printf '%s\n' "$t"; break; }; done)
  if [ -n "$bad" ]; then MUT_WHY="output redirection to '$bad'"; return 0; fi
  return 1
}

# For a mutating command: does it name a path this phase may not change? Sets HIT_PATH / HIT_WHY.
cmd_hits_protected() {
  local r
  HIT_PATH=""; HIT_WHY=""
  while IFS= read -r r; do
    [ -n "$r" ] || continue
    case "$r" in .devloop/"$TASKP"/*) continue ;; esac
    dl_is_drift "$r" && continue                     # tests/__pycache__, .pytest_cache ...
    if dl_is_pinned "$r" && ! in_allow_list "$r"; then HIT_PATH=$r; HIT_WHY="pinned for this run"; return 0; fi
    if dl_is_protected "$r" && ! in_allow_list "$r"; then
      case "$CLASS" in
        implement) if [ -e "$DL_PROJECT_DIR/$r" ] && dl_in_base "$r"; then HIT_PATH=$r; HIT_WHY="an existing protected file"; return 0; fi ;;
        *) HIT_PATH=$r; HIT_WHY="protected (protected_paths)"; return 0 ;;
      esac
    fi
  done <<EOF
$(cmd_write_targets "$1")
EOF
  return 1
}

# Read-only phases: does a mutating command name anything in the project outside .devloop/<task>/?
cmd_hits_project() {
  local r
  HIT_PATH=""
  while IFS= read -r r; do
    [ -n "$r" ] || continue
    case "$r" in .devloop/"$TASKP"/*) continue ;; esac
    HIT_PATH=$r; return 0
  done <<EOF
$(cmd_write_targets "$1")
EOF
  return 1
}

check_bash() {
  local cmd gitops c2 k v
  cmd=$(dl_json_get "$INPUT" tool_input.command)
  [ -n "$cmd" ] || exit 0
  MUT_WHY=""

  # 1) control plane
  if printf '%s' "$cmd" | grep -q 'devloop-state\.sh'; then
    [ "$DL_IS_SUBAGENT" = 1 ] && dl_block "only the dev-loop orchestrator (main thread) may run devloop-state.sh ($WHO)"
    # fall through: the rest of the command is still checked below
  fi
  if printf '%s' "$cmd" | grep -Eq '\.devloop/(ACTIVE|config\.ya?ml)|\.devloop/[^/[:space:]]+/(state|protected\.txt|allow\.txt|protected-hashes\.txt)|\.claude/(hooks/|settings|skills/dev-loop|agents/devloop-)' \
     && cmd_mutates "$cmd"; then
    dl_block "command appears to modify dev-loop control files ($MUT_WHY). Run state changes go through devloop-state.sh (orchestrator only)."
  fi

  if printf '%s' "$cmd" | grep -q 'refs/devloop'; then
    dl_block "the dev-loop pin record (refs/devloop/...) is managed only by devloop-state.sh ($WHO)."
  fi
  if cmd_mutates "$cmd"; then
    while IFS= read -r r; do
      case "$r" in
        .devloop|.devloop/"$TASKP"|.devloop/ACTIVE|.devloop/active|.devloop/config.y*ml|.devloop/*/state|.devloop/*/protected.txt|.devloop/*/allow.txt|.devloop/*/protected-hashes.txt|.devloop/*/integrity.log)
          dl_block "$r is a dev-loop run file and may not be deleted, moved or overwritten during run '$DL_TASK' ($WHO)." ;;
        .devloop/"$TASKP"/history|.devloop/"$TASKP"/history/*)
          [ "$DL_IS_SUBAGENT" = 1 ] && dl_block "$r: .devloop/$DL_TASK/history/ is written only by the orchestrator" ;;
        .devloop/"$TASKP"/*) ;;
        .devloop/*) dl_block "$r belongs to another dev-loop task ($WHO)." ;;
      esac
    done <<EOF
$(cmd_write_targets "$cmd")
EOF
  fi

  # 1b) sanctioned runner / exact configured commands (they legitimately write build & test outputs)
  if printf '%s' "$cmd" | grep -Eq '^[[:space:]]*(bash[[:space:]]+)?("?\$CLAUDE_PROJECT_DIR"?/|\./)?\.claude/hooks/devloop-run\.sh([[:space:]][^;&|<>`$()]*)?$'; then
    exit 0
  fi
  c2=$(printf '%s' "$cmd" | sed -E 's/^\(?[[:space:]]*(timeout[[:space:]]+(-[^[:space:]]+[[:space:]]+)*[0-9]+[smh]?[[:space:]]+)?//; s/\)?[[:space:]]*(>.*)?$//')
  for k in setup build typecheck lint test e2e env_up env_down; do
    v=$(dl_cfg_get commands "$k")
    [ -n "$v" ] && { [ "$cmd" = "$v" ] || [ "$c2" = "$v" ]; } && exit 0
  done

  if [ "$(redirect_targets "$cmd" | grep -c .)" -gt 60 ]; then
    dl_block "command has more than 60 output redirections; too complex for the dev-loop guard to check. Split it into smaller commands."
  fi

  # 2) git operations that rewrite history/worktree (would invalidate base-commit diffs)
  gitops='commit|push|reset|rebase|stash|clean|checkout|restore|switch|merge|cherry-pick|revert|am|apply|rm|mv|update-ref|filter-branch'
  [ "$CLASS" = finalize ] && gitops='push|reset|rebase|stash|clean|checkout|restore|switch|merge|cherry-pick|revert|am|apply|update-ref|filter-branch'
  if printf '%s' "$(dl_clean_cmd "$cmd")" | sed -E 's/git[[:space:]]+stash[[:space:]]+(list|show)/git-stash-read/g' |
       grep -Eq "${W}git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+($gitops)([[:space:]]|\$)"; then
    dl_block "git history/working-tree operations are not allowed during a dev-loop run ($WHO). For base comparisons use: git worktree add \"\$TMPDIR/devloop-base-$DL_TASK\" $DL_BASE"
  fi

  # 3) snapshot / golden-file updates rewrite expected results
  case "$CLASS" in fix|readonly)
    if printf '%s' "$cmd" | grep -Eq -- '--updateSnapshot|--update-snapshots?([[:space:]]|$|=(true|yes|all|new))|--snapshot-update([[:space:]]|$|=(true|yes))|(jest|vitest)[^;&|]*[[:space:]]-u([[:space:]]|$)|UPDATE_SNAPSHOTS?=|UPDATE_GOLDEN|[[:space:]]-update([[:space:]]|$)'; then
      dl_block "updating snapshots/golden files is not allowed ($WHO); that rewrites expected results."
    fi ;;
  esac

  # 4) implement / fix / finalize: a write through Bash must not touch protected or pinned files
  case "$CLASS" in implement|fix|finalize)
    if cmd_mutates "$cmd" && cmd_hits_protected "$cmd"; then
      dl_block "$HIT_PATH is $HIT_WHY ($WHO), and this command changes files ($MUT_WHY). Tests may not be edited through Bash either. Fix the code under test; if the test is genuinely wrong, set STATUS: BLOCKED with a one-line BLOCKER and stop."
    fi ;;
  esac

  # 5) read-only phases
  if [ "$CLASS" = readonly ]; then
    if printf '%s' "$cmd" | grep -Eq "${W}(npm|pnpm|yarn|bun)[[:space:]]+(install|i|add|remove|rm|uninstall|update|up|upgrade)([[:space:]]|\$)|${W}pip3?[[:space:]]+(install|uninstall)|${W}(poetry|uv|cargo)[[:space:]]+(add|remove)|${W}go[[:space:]]+(get|mod[[:space:]]+tidy)|${W}bundle[[:space:]]+(install|update)"; then
      dl_block "dependency changes are not allowed in read-only phase '$DL_PHASE'. If setup is required, set commands.setup in .devloop/config.yaml (that exact command is allowed)."
    fi
    if cmd_mutates "$cmd"; then
      case "$MUT_WHY" in
        output\ redirection*) dl_block "read-only phase ($WHO): $MUT_WHY. Write output only under .devloop/$DL_TASK/ or \$TMPDIR." ;;
      esac
      if cmd_hits_project "$cmd"; then
        dl_block "read-only phase ($WHO): $MUT_WHY on $HIT_PATH. Only .devloop/$DL_TASK/ and \$TMPDIR may be changed. (Heuristic check; if it misfired, rephrase the command.)"
      fi
    fi
  fi
  exit 0
}

case "$(dl_json_get "$INPUT" tool_name)" in
  Edit|Write|MultiEdit|NotebookEdit) check_edit ;;
  Bash) check_bash ;;
esac
exit 0
