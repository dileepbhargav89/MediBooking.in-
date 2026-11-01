#!/usr/bin/env bash
# .claude/hooks/devloop-tamper-check.sh — detect test weakening between a run's base commit and the
# current working tree (committed + staged + unstaged + untracked). This is DETECTION: it works from
# the diff, so it also catches changes made through Bash that the PreToolUse guard cannot see.
#
# Usage: bash .claude/hooks/devloop-tamper-check.sh [--task <id>] [--base <ref>] [--no-untracked]
#   default base: base_commit of --task, else of the active run (.devloop/ACTIVE)
# Output: markdown on stdout; the first lines are machine-readable:
#   TAMPER_CHECK: CLEAN|SUSPICIOUS|ERROR
#   BASE: <sha>
#   FINDINGS: <n>   (suspicious)
#   NOTES: <n>      (informational: assertions removed without a net loss, approved exceptions)
# Exit: 0 clean · 1 suspicious · 2 error
set -u
HOOK_DIR=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
err() { echo "TAMPER_CHECK: ERROR"; echo "devloop-tamper-check: $*" >&2; exit 2; }
# shellcheck source=devloop-lib.sh
. "$HOOK_DIR/devloop-lib.sh" 2>/dev/null || err "devloop-lib.sh not found next to this script"

BASE=""; TASK=""; UNTRACKED=1
while [ $# -gt 0 ]; do
  case "$1" in
    --base|--task) [ $# -ge 2 ] || err "$1 needs a value"
                   if [ "$1" = --base ]; then BASE=$2; else TASK=$2; fi; shift 2 ;;
    --no-untracked) UNTRACKED=0; shift ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) err "unknown argument: $1" ;;
  esac
done

cd "$DL_PROJECT_DIR" 2>/dev/null || err "cannot cd to $DL_PROJECT_DIR"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || err "not inside a git work tree"
G="git -c core.quotePath=false"

DL_TASK_DIR=""
if [ -n "$TASK" ]; then
  DL_TASK_DIR="$DL_DIR/$TASK"; [ -r "$DL_TASK_DIR/state" ] || err "no state for task '$TASK'"
  [ -n "$BASE" ] || BASE=$(dl_kv_get "$DL_TASK_DIR/state" base_commit)
elif dl_load_state; then
  [ -n "$BASE" ] || BASE=$DL_BASE
fi
case "$BASE" in ''|none) err "no base commit; pass --base <ref> or --task <id>" ;; esac
BASE_SHA=$(git rev-parse --verify --quiet "$BASE^{commit}") || err "cannot resolve base '$BASE'"

TEST_GLOBS=$(dl_cfg_list test_globs)
is_test_path() {
  local p=$1 b=${1##*/} g
  case "/$p" in */test/*|*/tests/*|*/__tests__/*|*/spec/*|*/specs/*|*/testdata/*|*/src/test/*|*/e2e/*) return 0 ;; esac
  case "$b" in
    *_test.go|*_test.py|test_*.py|conftest.py|*.test.*|*.spec.*|*Test.java|*Tests.java|*IT.java|\
    *Test.kt|*Tests.kt|*_spec.rb|*_test.rb|*Test.php|*Tests.cs|*Test.cs|*.snap) return 0 ;;
  esac
  while IFS= read -r g; do [ -n "$g" ] && dl_glob_match "$p" "$g" && return 0; done <<EOF
$TEST_GLOBS
EOF
  return 1
}
is_runner_config() {   # test-only config: any change is suspicious
  case "${1##*/}" in
    jest.config.*|vitest.config.*|vitest.workspace.*|karma.conf.*|.mocharc*|playwright.config.*|\
    cypress.config.*|pytest.ini|.coveragerc|phpunit.xml*|testng.xml|.nycrc*) return 0 ;;
  esac; return 1
}
is_mixed_config() {    # may contain test settings: only test-related lines are flagged
  case "$1" in .github/workflows/*|.gitlab-ci.yml|.circleci/*|Jenkinsfile) return 0 ;; esac
  case "${1##*/}" in
    package.json|pyproject.toml|setup.cfg|tox.ini|noxfile.py|pom.xml|build.gradle|build.gradle.kts|\
    Makefile|Cargo.toml|*.csproj) return 0 ;;
  esac; return 1
}
is_snapshot() { case "/$1" in *.snap|*/__snapshots__/*|*/testdata/*|*golden*) return 0 ;; esac; return 1; }

NL='
'
FINDINGS=""
add() { FINDINGS="$FINDINGS$1$TAB$2$TAB$3$TAB$4$NL"; }
TESTFILES=""; CFGFILES=""; NEWFILES=""

NS=$($G diff --name-status -M --no-color "$BASE_SHA" -- . ':(exclude).devloop') || err "git diff failed"
while IFS="$TAB" read -r st a b; do
  [ -n "$st" ] || continue
  f=$a
  case "$st" in
    R*) f=$b
        if is_test_path "$a" && ! is_test_path "$b"; then add MOVED_OUT_OF_TESTS "$a" - "renamed to $b; no longer matches test patterns"; fi ;;
  esac
  if [ -n "$DL_TASK_DIR" ] && [ "$st" != A ] && dl_is_protected "$a"; then
    if [ -r "$DL_TASK_DIR/allow.txt" ] && grep -Fxq -- "$a" "$DL_TASK_DIR/allow.txt"; then
      add NOTE_PROTECTED_ALLOWED "$a" - "modified ($st); human-approved exception (allow.txt)"
    else add PROTECTED_MODIFIED "$a" - "status $st on a protected path"; fi
  fi
  case "$st" in M*|R*|D*|T*) is_snapshot "$a" && add SNAPSHOT_CHANGED "$a" - "existing snapshot/golden file changed ($st)" ;; esac
  if [ "$st" = D ]; then
    is_test_path "$a" && add DELETED_TEST "$a" - "test file deleted"
    is_runner_config "$a" && add TEST_CONFIG_CHANGED "$a" - "test runner config deleted"
    continue
  fi
  is_test_path "$f" && TESTFILES="$TESTFILES$f$NL"
  if is_runner_config "$f"; then add TEST_CONFIG_CHANGED "$f" - "test runner config modified ($st)"; CFGFILES="$CFGFILES$f$NL"
  elif is_mixed_config "$f"; then CFGFILES="$CFGFILES$f$NL"; fi
done <<EOF
$NS
EOF

if [ "$UNTRACKED" = 1 ]; then
  UNTR=$($G ls-files --others --exclude-standard -- . ':(exclude).devloop')
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    if is_test_path "$f"; then TESTFILES="$TESTFILES$f$NL"; NEWFILES="$NEWFILES$f$NL"; fi
    if is_runner_config "$f"; then add TEST_CONFIG_CHANGED "$f" - "new test runner config (untracked)"; CFGFILES="$CFGFILES$f$NL"; NEWFILES="$NEWFILES$f$NL"
    elif is_mixed_config "$f"; then CFGFILES="$CFGFILES$f$NL"; NEWFILES="$NEWFILES$f$NL"; fi
  done <<EOF
$UNTR
EOF
fi

AWK_SCAN='
function is_assert(s) { return s ~ /assert|expect[[:space:]]*\(|\.should|Assert\.|\.to[A-Z][A-Za-z]*\(|t\.(Errorf?|Fatalf?|Fail|FailNow)\(|require\.[A-Z]|verify\(/ }
function is_skip(s)   { return s ~ /@pytest\.mark\.(skip|xfail)|pytest\.(skip|xfail|importorskip)\(|unittest\.(skip|expectedFailure)|(^|[^A-Za-z0-9_])(xit|xdescribe|xtest|xcontext)[[:space:]]*\(|\.(skip|todo|skipIf)[[:space:]]*\(|@Disabled|@Ignore|assume(True|False|That)?[[:space:]]*\(|t\.Skip(Now|f)?\(|#\[ignore\]|\[Ignore|Skip[[:space:]]*=[[:space:]]*"|@skip|skip:[[:space:]]*true/ }
function is_focus(s)  { return s ~ /(^|[^A-Za-z0-9_])(fit|fdescribe|ftest)[[:space:]]*\(|\.only[[:space:]]*\(/ }
function is_cfg(s)    { return s ~ /testPathIgnorePatterns|testMatch|testRegex|--ignore|--deselect|addopts|norecursedirs|collect_ignore|testpaths|python_files|exclude|skipTests|maven\.test\.skip|testFailureIgnore|passWithNoTests|bail|fail_under|coverageThreshold|-run[[:space:]]|-skip[[:space:]]|"test"[[:space:]]*:/ }
function out(k, f, l, d) { gsub(/\t/, " ", d); sub(/^[[:space:]]+/, "", d); if (length(d) > 160) d = substr(d, 1, 157) "..."; print k "\t" f "\t" l "\t" d }
BEGIN {
  n = split(ENVIRON["DL_TESTFILES"], a, "\n"); for (i = 1; i <= n; i++) if (a[i] != "") T[a[i]] = 1
  n = split(ENVIRON["DL_CFGFILES"],  a, "\n"); for (i = 1; i <= n; i++) if (a[i] != "") C[a[i]] = 1
}
/^diff --git / { hdr = 1; file = ""; next }
hdr && /^--- / { old = substr($0, 5); sub(/^a\//, "", old); sub(/\t.*$/, "", old); next }
hdr && /^\+\+\+ / { nw = substr($0, 5); sub(/\t.*$/, "", nw)
                   if (nw == "/dev/null") file = old; else { sub(/^b\//, "", nw); file = nw }; next }
/^@@/ { hdr = 0
        if (match($0, /-[0-9]+/))  ol = substr($0, RSTART + 1, RLENGTH - 1) + 0
        if (match($0, /\+[0-9]+/)) nl = substr($0, RSTART + 1, RLENGTH - 1) + 0
        next }
hdr { next }
/^-/ { if (file == "") next; line = substr($0, 2)
       if ((file in T) && is_assert(line)) { rem[file]++; out("REMOVED_ASSERT", file, ol, line) }
       if ((file in C) && is_cfg(line)) out("TEST_CONFIG_LINE", file, ol, "- " line)
       ol++; next }
/^\+/ { if (file == "") next; line = substr($0, 2)
        if ((file in T) && is_assert(line)) add[file]++
        if ((file in T) || (file in C)) {
          if (is_skip(line))  out("ADDED_SKIP",  file, nl, line)
          if (is_focus(line)) out("ADDED_FOCUS", file, nl, line)
        }
        if ((file in C) && is_cfg(line)) out("TEST_CONFIG_LINE", file, nl, "+ " line)
        nl++; next }
END { for (f in rem) if (rem[f] > add[f] + 0)
        out("NET_ASSERT_LOSS", f, "-", rem[f] " assertion line(s) removed, " (add[f] + 0) " added") }
'

SCAN=$(printf '%s%s' "$TESTFILES" "$CFGFILES" | sort -u)
if [ -n "$SCAN" ]; then
  TRACKED=$(printf '%s\n' "$SCAN" | while IFS= read -r f; do
    [ -n "$f" ] && ! printf '%s' "$NEWFILES" | grep -Fxq -- "$f" && printf '%s\n' "$f"; done)
  LINES=$( {
      [ -n "$TRACKED" ] && printf '%s\n' "$TRACKED" | tr '\n' '\0' |
        xargs -0 $G diff -U0 --no-color --no-ext-diff -M "$BASE_SHA" --
      printf '%s' "$NEWFILES" | sort -u | while IFS= read -r f; do
        [ -n "$f" ] && $G diff --no-index -U0 --no-color -- /dev/null "$f"; done
      true
    } | DL_TESTFILES="$TESTFILES" DL_CFGFILES="$CFGFILES" awk "$AWK_SCAN" )
  [ -n "$LINES" ] && FINDINGS="$FINDINGS$LINES$NL"
fi

# Pinned files (repro test, new tests) must be byte-identical to when they were pinned.
if [ -n "$DL_TASK_DIR" ]; then
  [ -n "${DL_TASK:-}" ] || DL_TASK=$(basename "$DL_TASK_DIR")
  PINS=$(dl_pin_list)
  want=$(dl_kv_get "$DL_TASK_DIR/state" pins); case "$want" in ''|*[!0-9]*) want=0 ;; esac
  [ "$(printf '%s\n' "$PINS" | grep -c .)" -lt "$want" ] && add PIN_FILE_MISSING "$DL_TASK_DIR/protected-hashes.txt" - "state records $want pinned file(s) but fewer are listed"
  while IFS="$TAB" read -r pf ph; do
    [ -n "$pf" ] || continue
    if [ ! -f "$pf" ]; then add PIN_DELETED "$pf" - "pinned test file deleted"
    elif [ "$(git hash-object -- "$pf")" != "$ph" ]; then add PIN_CHANGED "$pf" - "pinned test file changed after it was pinned"; fi
  done <<EOF
$PINS
EOF
  # Attempts the integrity hook caught and undid during the run
  if [ -s "$DL_TASK_DIR/integrity.log" ]; then
    while IFS="$TAB" read -r ts kind file detail; do
      [ -n "$kind" ] || continue
      case "$kind" in   # undone attempts are notes (the code is clean); anything not undone stays suspicious
        *_RESTORED|READONLY_NEW_FILE|NEW_PROTECTED) add "NOTE_INTEGRITY_$kind" "$file" - "${detail:-caught and undone by the integrity hook} (at $ts)" ;;
        *) add "INTEGRITY_$kind" "$file" - "${detail:-caught by the integrity hook, NOT undone} (at $ts)" ;;
      esac
    done < "$DL_TASK_DIR/integrity.log"
  fi
fi

SUS=$(printf '%s' "$FINDINGS" | awk -F'\t' 'NF >= 4 && $1 != "REMOVED_ASSERT" && $1 !~ /^NOTE_/')
NOTES=$(printf '%s' "$FINDINGS" | awk -F'\t' 'NF >= 4 && ($1 == "REMOVED_ASSERT" || $1 ~ /^NOTE_/)')
nsus=$(printf '%s' "$SUS" | grep -c .); nnotes=$(printf '%s' "$NOTES" | grep -c .)
render() { printf '%s\n' "$1" | awk -F'\t' 'NF >= 4 { d = $4; gsub(/\|/, "\\|", d); printf("| %s | %s | %s | %s |\n", $1, $2, $3, d) }'; }

verdict=CLEAN; [ "$nsus" -gt 0 ] && verdict=SUSPICIOUS
echo "TAMPER_CHECK: $verdict"
echo "BASE: $BASE_SHA"
echo "FINDINGS: $nsus"
echo "NOTES: $nnotes"
echo
echo "# Test Tamper Check"
echo
echo "Working tree (untracked included: $([ "$UNTRACKED" = 1 ] && echo yes || echo no)) vs base \`$BASE_SHA\`."
if [ -n "$DL_TASK_DIR" ] && [ "$(dl_kv_get "$DL_TASK_DIR/state" base_dirty)" = yes ]; then
  echo "> WARNING: the tree had uncommitted changes when the run started; some findings may predate the run."
fi
if [ "$nsus" -gt 0 ]; then
  printf '\n## Suspicious\n| Kind | File | Line | Detail |\n|---|---|---|---|\n'; render "$SUS"
fi
if [ "$nnotes" -gt 0 ]; then
  printf '\n## Notes (review; not necessarily tampering)\n| Kind | File | Line | Detail |\n|---|---|---|---|\n'; render "$NOTES"
fi
cat <<'EOF'

## Legend
DELETED_TEST / MOVED_OUT_OF_TESTS: tests removed or moved out of discovery · ADDED_SKIP / ADDED_FOCUS:
skip/xfail/@Disabled/t.Skip or .only/fit added · NET_ASSERT_LOSS: a test file lost more assertion lines than it gained ·
TEST_CONFIG_CHANGED / TEST_CONFIG_LINE: runner config or test-selection settings changed · SNAPSHOT_CHANGED:
expected outputs rewritten · PROTECTED_MODIFIED: protected path changed without approval ·
NOTE_INTEGRITY_*: a forbidden change the integrity hook caught and undid during the run (the reviewer must mention it) ·
INTEGRITY_*: a forbidden change it caught but could NOT undo ·
PIN_CHANGED / PIN_DELETED / PIN_FILE_MISSING: a pinned repro/new test changed after it was pinned (never justifiable).
Heuristic: the logic reviewer must justify or reject each item in review-logic.md (Test Integrity).
EOF
[ "$verdict" = CLEAN ] && exit 0 || exit 1
