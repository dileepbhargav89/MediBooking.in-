#!/usr/bin/env bash
# Phase 1 regression + robustness checks for the dev-loop kit.
KIT=${KIT:-$(cd "$(dirname "$0")/.." && pwd)}
S=$(mktemp -d); cd "$S" && git init -q && git config user.email t@t && git config user.name t
cp -r "$KIT/.claude" . ; cp "$KIT/.gitattributes" .; mkdir -p .devloop src tests packages/a/tests
python3 - "$KIT" <<'EOF'
import sys
s=open(sys.argv[1]+'/.devloop/config.example.yaml').read()
s=s.replace('  test: null           # full suite (required)','  test: "python3 -m pytest -q --junitxml=junit-report.xml"').replace('  test_single: null    #','  test_single: "python3 -m pytest -q {path}"  #')
s=s.replace('  - "tests"\n','  - "tests"\n  - "packages/*/tests"\n  - "spec"\n',1)
open('.devloop/config.yaml','w').write(s)
EOF
printf 'def add(a,b):\n    return a-b\n' > src/calc.py; touch src/__init__.py
printf 'from src.calc import add\ndef test_zero():\n    assert add(0,0)==0\n' > tests/test_calc.py
printf 'def test_pkg():\n    assert True\n' > packages/a/tests/test_pkg.py
printf '.devloop/*\n!.devloop/config.yaml\n' > .gitignore; git add -A && git commit -qm init
export CLAUDE_PROJECT_DIR=$S; H=.claude/hooks; R="bash $H/devloop-run.sh"; ST="bash $H/devloop-state.sh"
pass=0; fail=0; ok(){ if [ "$1" = "$2" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $3 (got '$1' want '$2')"; fi; }
gr(){ out=$(printf '%s' "$1" | bash $H/devloop-guard.sh 2>/dev/null); rc=$?; case "$out" in *'"permissionDecision":"deny"'*) echo BLOCK ;; *) [ $rc -eq 2 ] && echo BLOCK || echo ALLOW ;; esac; }
sc(){ out=$(printf '%s' "$1" | bash $H/devloop-stop-check.sh 2>/dev/null); case "$out" in *'"decision":"block"'*) echo BLOCK ;; *) echo ALLOW ;; esac; }
E(){ printf '{"tool_name":"Edit","agent_id":"a","agent_type":"devloop-%s","tool_input":{"file_path":"%s"}}' "$1" "$2"; }
B(){ python3 -c 'import json,sys; print(json.dumps({"tool_name":"Bash","agent_id":"a","agent_type":"devloop-"+sys.argv[1],"tool_input":{"command":sys.argv[2]}}))' "$1" "$2"; }

warn=$($ST start t1 bugfix 2>&1 >/dev/null); ok "$(printf '%s' "$warn" | grep -c "matches no tracked file")" 1 "start warns for unmatched 'spec' glob"
mkdir -p .devloop/t1/history
$R test --label baseline >/dev/null; ok $? 0 "baseline test"
# item 6: subtree globs
$ST phase fix >/dev/null 2>&1
ok "$(gr "$(E fixer "$S/packages/a/tests/test_pkg.py")")" BLOCK "packages/*/tests protects subtree"
ok "$(gr "$(E fixer "$S/src/calc.py")")" ALLOW "fixer may edit source"
# item 4: Bash writes to protected tests in fix
ok "$(gr "$(B fixer "sed -i s/0/1/ tests/test_calc.py")")" BLOCK "fix: sed -i on test"
ok "$(gr "$(B fixer "python3 -c \"open('tests/test_calc.py','w').write('')\"")")" BLOCK "fix: python -c write"
ok "$(gr "$(B fixer "cp /tmp/x tests/test_calc.py")")" BLOCK "fix: cp over test"
ok "$(gr "$(B fixer "ln -sf /dev/null tests/test_calc.py")")" BLOCK "fix: ln -sf over test"
ok "$(gr "$(B fixer "python3 -m pytest tests/test_calc.py 2>&1 | tee /tmp/log")")" ALLOW "fix: pytest | tee /tmp (no false block)"
ok "$(gr "$(B fixer "cp tests/test_calc.py /tmp/copy.py")")" ALLOW "fix: copying a test OUT is fine"
# item 2: pin file is a control file
$ST phase implement >/dev/null 2>&1
printf 'from src.calc import add\ndef test_repro():\n    assert add(2,2)==4\n' > tests/test_repro.py
$ST protect ./tests/test_repro.py >/dev/null; ok "$(cut -f1 .devloop/t1/protected-hashes.txt)" "tests/test_repro.py" "protect normalises ./ path"
ok "$($ST get pins)" 1 "pin count stored"
ok "$(gr "$(E implementer "$S/tests/test_repro.py")")" BLOCK "pinned via ./ path is enforced"
ok "$(gr "$(B implementer "rm .devloop/t1/protected-hashes.txt")")" BLOCK "rm of pin file blocked"
ok "$(gr "$(E implementer "$S/.devloop/t1/protected-hashes.txt")")" BLOCK "Edit of pin file blocked"
ok "$(gr "$(B implementer "cat > tests/test_new.py <<'EOF'
def test_x(): pass
EOF")")" ALLOW "implementer may create a NEW test via heredoc"
mv .devloop/t1/protected-hashes.txt /tmp/ph.$$; $ST verify-pins >/dev/null; ok $? 1 "verify-pins fails when pin file vanishes"
bash $H/devloop-tamper-check.sh --task t1 | grep -q PIN_FILE_MISSING; ok $? 0 "tamper-check reports PIN_FILE_MISSING"
mv /tmp/ph.$$ .devloop/t1/protected-hashes.txt
# item 8: finalize precondition
sed -i 's/a-b/a+b/' src/calc.py
$ST phase review >/dev/null 2>&1; $ST set reviewed_diff "$($R diffhash)" >/dev/null
echo "# late edit" >> src/calc.py
$ST phase finalize >/dev/null 2>&1; ok $? 2 "finalize refused after post-review edit"
sed -i '$d' src/calc.py
$ST phase finalize >/dev/null 2>&1; ok $? 0 "finalize allowed when diff matches review"
# item 3: fail closed
$ST set base_commit deadbeef >/dev/null 2>&1   # 'set' refuses base_commit; edit state directly to simulate
sed -i 's/^base_commit=.*/base_commit=deadbeef/' .devloop/t1/state .devloop/ACTIVE
out=$($R diffhash 2>/dev/null); rc=$?; ok "$out/$rc" "ERROR/2" "diffhash fails closed on bad base"
$ST phase fix >/dev/null 2>&1
ok "$(gr "$(E implementer "$S/tests/test_calc.py")")" BLOCK "unknown base: existing protected test still blocked for implementer"
# item 7: runner kill marker
cat > /tmp/slowcfg.$$ <<'EOF'
EOF
sed -i 's#^  e2e: null.*#  e2e: "sleep 37"#' .devloop/config.yaml
( $R e2e --label k >/dev/null 2>&1 & echo $! > /tmp/rp.$$; wait ) & sleep 2; kill -TERM "$(cat /tmp/rp.$$)"; sleep 2
ok "$(cat .devloop/t1/history/e2e-k.log.exit 2>/dev/null)" KILLED "killed runner writes KILLED"
pgrep -fx "sleep 37" >/dev/null; ok $? 1 "killed runner stops its child processes"
# item 1: CRLF scripts never block, JSON stop decisions
cp $H/devloop-guard.sh /tmp/g.$$ ; sed -i 's/$/\r/' $H/devloop-guard.sh
out=$(E fixer "$S/src/calc.py" | sh -c "bash \"$H/devloop-guard.sh\" || true" 2>/dev/null); rc=$?
ok "$rc" 0 "CRLF-broken guard exits 0 through the settings wrapper"
cp /tmp/g.$$ $H/devloop-guard.sh
$ST phase test >/dev/null 2>&1; rm -f .devloop/t1/test-report.md
ok "$(sc '{"hook_event_name":"SubagentStop","agent_id":"x","agent_type":"devloop-tester"}')" BLOCK "SubagentStop blocks via JSON"
ok "$(sc '{"hook_event_name":"Stop"}')" BLOCK "Stop mid-run blocks via JSON"
# item 5: case-insensitive
ok "$(DEVLOOP_CASE_INSENSITIVE=1 gr "$(E fixer "$S/Tests/Test_Calc.py")")" BLOCK "case variant blocked on case-insensitive FS"
ok "$(gr "$(B tester "grep -n 'x > 0' src/calc.py")")" ALLOW "quoted > is not a redirect"
ok "$(gr "$(B tester "echo x > /tmp/../$S/src/calc.py")")" BLOCK "/tmp/../ redirect into project blocked"
# ---- integrity layer (PostToolUse): detect and restore, whatever the command was
IN(){ python3 -c 'import json,sys; print(json.dumps({"hook_event_name":"PostToolUse","tool_name":"Bash","agent_id":"a","agent_type":"devloop-"+sys.argv[1],"tool_input":{"command":"x"}}))' "$1"; }
integ(){ IN "$1" | bash $H/devloop-integrity.sh 2>/dev/null; }
$ST --force start t2 bugfix >/dev/null 2>&1; mkdir -p .devloop/t2/history
printf 'from src.calc import add\ndef test_repro():\n    assert add(2,2)==4\n' > tests/test_repro2.py
$ST protect tests/test_repro2.py >/dev/null; $ST phase fix >/dev/null 2>&1
orig=$(git hash-object tests/test_repro2.py)
python3 - <<'PY'
open('tests/test_repro2.py','w').write('def test_repro():\n    assert True\n')
PY
out=$(integ fixer); ok "$(git hash-object tests/test_repro2.py)" "$orig" "integrity restores a pinned test changed by a python heredoc"
case "$out" in *'"decision":"block"'*) r=yes ;; *) r=no ;; esac; ok "$r" yes "integrity tells the agent (block decision)"
grep -q PIN_RESTORED .devloop/t2/integrity.log; ok $? 0 "integrity logs the attempt"
bash $H/devloop-tamper-check.sh --task t2 | grep -q INTEGRITY_PIN_RESTORED; ok $? 0 "tamper-check surfaces the logged attempt"
( cd tests && sed -i 's/0/9/' test_calc.py ); integ fixer >/dev/null
ok "$(git diff --name-only HEAD -- tests/test_calc.py)" "" "integrity restores a protected test edited after cd"
: > .devloop/t2/protected-hashes.txt; integ fixer >/dev/null
ok "$(cut -f1 .devloop/t2/protected-hashes.txt)" "tests/test_repro2.py" "emptied pin list is restored from git"
$ST verify-pins >/dev/null; ok $? 0 "pins verify against the git record"
ok "$(gr "$(B fixer "git update-ref -d refs/devloop/t2/pins")")" BLOCK "agents cannot touch the git pin record"
$ST phase review >/dev/null 2>&1
printf 'x = 1\n' >> src/calc.py; integ review-logic >/dev/null
ok "$(tail -1 src/calc.py)" "    return a+b" "read-only phase: source edit is restored"
ok "$(gr "$(B review-logic "cat > .devloop/t2/review-logic.md <<'EOF'
> **Note** a -> b, x > threshold
EOF")")" ALLOW "markdown report via heredoc is not a false block"
ok "$(gr "$(B tester "git stash list")")" ALLOW "git stash list allowed"
$ST end x >/dev/null 2>&1
$ST --force resume t1 >/dev/null 2>&1

# recovery: end with task dir gone
rm -rf .devloop/t1; $ST end >/dev/null 2>&1; ok $? 0 "end recovers when task folder is gone"; ok "$([ -f .devloop/ACTIVE ] && echo yes || echo no)" no "ACTIVE removed"
cd /; rm -rf "$S" /tmp/g.$$ /tmp/rp.$$ /tmp/slowcfg.$$
echo "PASSED $pass / $((pass+fail))"
