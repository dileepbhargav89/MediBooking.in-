---
ARTIFACT: test-report
TASK: {{task_id}}
MODE: <bugfix|port|feature>
ITERATION: <n>                 # must equal state iteration (0 = right after implementation)
STATUS: <COMPLETE|BLOCKED>     # BLOCKED = could not run (env/tooling), NOT "tests failed"
VERDICT: <PASS|FAIL>
BLOCKER: none
FAILED: <count>                # number of lines in "Failing IDs"
FAILING_IDS_HASH: <hash|none>  # = bash .claude/hooks/devloop-run.sh failhash <this file>; the orchestrator recomputes it
---
<!-- Run every step with: bash .claude/hooks/devloop-run.sh <step> [--path P]   (never the raw command)
     VERDICT = PASS iff every configured step exited 0 (or failed only with PRE_EXISTING / KNOWN_FLAKY failures)
     AND every unit/e2e AC or parity item is PASS. An UNVERIFIED unit/e2e item = FAIL (a planned test is missing).
     browser/manual ACs are not the tester's: mark them N/A.
     SKIPPED is never evidence of passing. NO_TESTS_RAN and TIMEOUT are failures.
     List at most 30 failures in detail; summarise the rest by count. Report, do not fix. -->

# Test Report — iteration {{n}}

## Steps
| Step | Exit (from devloop-run.sh) | Tests ran | Duration | Log |
|---|---|---|---|---|
| setup | | | | |
| build | | | | |
| typecheck | | | | |
| lint | | | | |
| test_single | | | | |
| test | | | | |
| e2e | | | | |

## Failing IDs
<!-- One per line: every failure counted in FAILED (REGRESSION, NEW_TEST, ENV, NO_TESTS_RAN, TIMEOUT, and FLAKY in
     changed code or new tests). Use step:<name> for a failing step without a test id (e.g. step:typecheck).
     Write "none" if empty. -->
- {{id}}

## Failures
### F1 `{{test id}}`
- Location: path:line
- Classification: REGRESSION | NEW_TEST | PRE_EXISTING | KNOWN_FLAKY | FLAKY (failed, passed on rerun) | ENV
  <!-- FLAKY in a file the diff touches, or in a new test, counts as FAILED. FLAKY elsewhere is listed under
       "Not verified" but does not fail the VERDICT. -->
- Excerpt (≤ 20 lines):
- Likely cause (one line):

## [bugfix] Repro Test
- REPRO_TEST `{{path}}` → PASS / FAIL

## [port] Parity Status
| Parity item | PASS / FAIL / UNVERIFIED | Evidence |
|---|---|---|

## Acceptance Criteria
| AC | Verified by | PASS / FAIL / UNVERIFIED / N/A (browser, manual) | Evidence (test id) |
|---|---|---|---|

## Not verified
<!-- SKIPPED steps, PRE_EXISTING and FLAKY failures outside changed code, anything you could not run. -->
