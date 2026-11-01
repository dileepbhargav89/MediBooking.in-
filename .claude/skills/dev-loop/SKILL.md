---
name: dev-loop
description: Multi-agent development loop for code changes - investigate, plan, 4-lens plan review (logic, regression, integration, performance), implement, test, verify web UI in a real browser (Claude in Chrome or Playwright), fix/retest (capped), 4-lens code review, finalize. Use when the user asks to fix a bug, port or migrate code between languages/frameworks/libraries, or implement a feature end to end, or types /dev-loop. Supports --mode, --gate, --max-iter, --resume, --status, --abort.
---

# dev-loop orchestrator

You are the **orchestrator**. You:
- start phase subagents,
- check the artifacts they write,
- run the verification yourself,
- and drive run state through `devloop-state.sh`.

You never edit product code or tests. You write only inside `.devloop/<id>/`.

Shorthand:
- `S` = `bash .claude/hooks/devloop-state.sh` (the only way to change run state)
- `R` = `bash .claude/hooks/devloop-run.sh` (the only way to run project commands)
- `D` = `.devloop/<id>/`
- `T` = `.claude/skills/dev-loop/templates/`

## 1. Invocation

```
/dev-loop "<task>" [--mode bugfix|port|feature] [--gate plan|none|all] [--max-iter N]
/dev-loop --resume <id> [approve | revise "<feedback>" | abort] [--max-iter N]
/dev-loop --status [<id>]          /dev-loop --abort
```

- **Task.** Everything that isn't a flag. Copy it verbatim into `D/task.md`, including any issue text or links.
- **--mode.** If it's missing, infer it:
  - crash / error / regression / wrong output → `bugfix`;
  - port / migrate / convert / "from X to Y" → `port`;
  - anything else → `feature`.
  
  If two modes fit equally well, ask one question.
- **--gate.** Defaults to config `gate.default`, else `plan`.
  - `plan`: pause after the plan.
  - `all`: also pause after investigation and before finalize.
  - `none`: never pause, except for the mandatory gates in P2 and P7.
- **--max-iter.** 1–10. Run `S set max_iterations N`; it overrides config `loop.max_iterations`.
- **--status.** Run `S show [<id>]` or `S list` and summarise. Change nothing.
- **--abort.** Run `R env_down`, then `S end aborted`, then report.

## 2. Preconditions

1. **Config.** Read `.devloop/config.yaml`.
   - If it's missing, or `commands.test` is empty, STOP and tell the user to copy `.devloop/config.example.yaml` and fill it in. Never guess commands.
   - **bugfix** also needs `commands.test_single`, because the repro test must be run on its own.
   - If `protected_paths` is empty, existing tests aren't protected by the hooks. Ask the user to add their test directories before starting. If nobody is there to answer, STOP.
   - Other empty commands are SKIPPED. They are recorded under "Not verified" and never count as passing.
2. **Git.** It must be a git repo with at least one commit.
   - If `.devloop/` isn't git-ignored (check with `git check-ignore -q .devloop/x`), ask before continuing.
   - If `git status --porcelain` is non-empty, ask, because those uncommitted changes would become part of the base diff.
3. **Branch.** If `finalize.branch` is set:
   1. generate the id (§3 step 1);
   2. substitute `{task_id}`;
   3. create and switch to the branch **before** `S start`, because the guard blocks branch switching during a run.

## 3. Start

1. `id = YYYYMMDD-HHMM-<slug>`. The slug is the first ≤5 meaningful words of the task, kebab-case, ≤40 characters.
2. Run `S start <id> <mode>`. It records the base commit, snapshots `protected_paths`, sets the phase to `investigate` and writes `.devloop/ACTIVE`. If it fails, stop and report why.
   - If it prints `WARNING: protected_paths entry '…' matches no tracked file`, show the user. Their tests may be unprotected, and the config needs fixing. If nobody is there to answer, stop: `S end aborted`.
3. Write `D/task.md` with these lines:
   - `TASK: <id>`
   - `MODE: <mode>`
   - `BASE: <base_commit from S show>`
   - `GATE: <gate>`
   - then `## Request` followed by the verbatim task.
4. `mkdir -p D/history`, then `S set gate <gate>`. If `--max-iter` was given, also `S set max_iterations <N>`.

## 4. Delegation protocol

Start each phase with the Agent tool (`subagent_type: devloop-<role>`), **always in the foreground**: never set `run_in_background`. Bash approvals and browser site-permission prompts have to reach the user.

**Parallel exception.** The lens reviewers (P2b and P6) only read code, so start all of them in **one message**: several Agent calls side by side, each in the foreground. Nothing else runs in parallel.

**Lenses.** The lenses come from config `review_lenses` (default: `logic`, `regression`, `integration`, `performance`). Each lens's agent is `devloop-review-<lens>`.
- Accept only those four names. Warn about and ignore anything else.
- `logic` is always included, because it runs the tamper check.
- Record the result once with `S set lenses <comma-list>`, and use that list everywhere.

Subagents have no memory, so each prompt must be self-contained:

```
Task id: <id>   Mode: <mode>   Work folder: .devloop/<id>/   Config: .devloop/config.yaml
Template: .claude/skills/dev-loop/templates/<artifact>.md
Step: <P3a | P3b | P3 — implementer only>
Stage: <plan | code — lens reviewers only>   Round: <plan-review round — plan stage only>
READ: <explicit paths>
WRITE: <exact path(s)>
DO NOT READ: <paths, if any>
Iteration: <S get iteration> of max <S get max_iterations, else config loop.max_iterations, else 3>
Items to address: <ids — fixer only>
<phase-specific values: DIFF_HASH, base URL and driver, ...>
Run project commands only via: bash .claude/hooks/devloop-run.sh <step> [--path P]
Finish with your artifact's STATUS line (and VERDICT if it has one).
```

**Hook decisions.** There are two layers, and neither is ever to be worked around.
- **Guard (before a tool call).** A blocked call arrives as a "denied" tool result with the reason. Read the reason, then rephrase, or route the work to the right phase.
- **Integrity check (after every tool call).** It restores pinned and protected tests, and undoes writes made in read-only phases, whatever command made them. It logs each case to `D/integrity.log` and shows the reason to the agent.
  - The reviewers and the finalizer see `integrity.log` through the tamper check.
  - If a phase keeps triggering it (3+ entries from one agent), stop that phase and escalate `agent_blocked`, quoting the log.

**Your own `R` calls** (P3a, P7, env):
- Set the Bash tool timeout to 600000 ms.
- If config `timeouts.<step>` is over 540, start `R` with `run_in_background` and poll until `<LOG>.exit` exists.

**Before** each delegation, run `S phase <phase> <role>`.
- Exit 3 means files changed during the previous read-only phase. Run `git status`:
  - if only build or test outputs changed, add them to `drift_ignore` in the config and tell the user;
  - otherwise treat it as a blocking finding: re-run that phase once, or escalate `protocol_failure`.

**After** each delegation, check the artifact yourself. Never trust the agent's reply text.
- Read the header block: the `KEY: value` lines between the first two `---` lines.
- No `<...>` placeholder may remain **in the header**.
- No `{{` may remain anywhere.
- Required sections must be non-empty.
- Then the phase-specific checks in §5.

If a check fails:
- re-run the same agent **once**, quoting the exact defect (this does not consume an iteration);
- if it fails again → escalate `protocol_failure`.

`STATUS: BLOCKED` → escalate `agent_blocked` with the `BLOCKER` text. There are special cases in P3a and P4b.

## 5. Phases

### P1 Investigate
- Phase: `investigate`. Agent: `devloop-investigator`.
- READ: `D/task.md`, plus feedback files on a revise.
- WRITE: `D/investigation.md`.

**Verify:**
- `MODE` matches.
- `BASELINE_FAILURES` is a number or `NOT_RUN`.
- **bugfix:** `REPRO_TEST` is a new path, and the Reproduction section is filled.
- **port:** the Source API Inventory has rows.
- **feature:** there are draft ACs.

`--gate all` → pause (§8).

### P2 Plan
- Phase: `plan`. Agent: `devloop-planner`.
- READ: `D/task.md`, `D/investigation.md`, plus feedback files.
- WRITE: `D/plan.md`.

**Verify:**
- `GATE: PENDING`.
- The Change List is non-empty and every row has "Traces to".
- The Test Strategy is non-empty.
- Every AC has "Verified by" set to unit, e2e, browser or manual.
- Every browser AC has a UI Verification row.
- **bugfix:** the first test row is `REPRO_TEST`.
- **port:** every inventory symbol is in the API Mapping, and there's at least one parity item.

### P2b Plan review (all lenses, in parallel)
Runs after every P2, including a P2 re-run after a revise. It doesn't consume fix iterations.

0. **Round counting.** `plan_review_round` only ever goes up, so archive names stay unique. `plan_cycle_start` marks where the current cycle began: it is 0 at the start, and gets reset after every human revise.
1. `pr = (S get plan_review_round, or 0) + 1`. Don't save it yet.
2. `S phase plan-review reviewers`.
3. In **one message**, start every lens agent with `Stage: plan` and `Round: <pr>`.
   - READ: `D/task.md`, `D/investigation.md`, `D/plan.md`, plus `D/history/plan-review-<lens>-<pr-1>.md` **only if that file exists and `pr-1` > `plan_cycle_start`**.
   - WRITE: `D/plan-review-<lens>.md`.
4. **Verify each:**
   - `LENS` and `ROUND` match;
   - `VERDICT: PASS` ⇔ `BLOCKING_ISSUES: 0`;
   - every BLOCKING row names a plan row or section.
   
   Archive each: `cat D/plan-review-<lens>.md > D/history/plan-review-<lens>-<pr>.md`. **Then** run `S set plan_review_round <pr>`.
5. **Decide:**
   - **All PASS** → browser preflight, then the gate.
   - **Any FAIL, and `pr - plan_cycle_start` < config `review.plan_max_rounds` (default 2)** → re-run P2. Add each failing lens's archived copy `D/history/plan-review-<lens>-<pr>.md` to its READ, with: "Address every BLOCKING finding. Add a `## Review responses` section: finding id → the change you made, or why you rejected it." Then run P2b again.
   - **Any FAIL after the last round** → the gate becomes **mandatory**. Show the human the unresolved BLOCKING findings next to the plan. They can:
     - approve, accepting the risk (record the finding ids in Gate Notes);
     - revise;
     - abort.
6. At the gate, also show every lens's MAJOR findings and its "Questions for the human".
7. On a human `revise` (at the gate here, or through §8 resume): `S set plan_cycle_start <S get plan_review_round>`, then P2, then P2b.
8. **Stale reviews.** Before **every** P2 run, empty the current review files: `: > D/plan-review-<lens>.md` for each lens. They're already archived. That way an interrupted run can never mistake old reviews for reviews of the new plan.

**Browser preflight.** Only if any AC is `browser`, and config `browser.enabled` isn't `off`:
1. **Pick the driver.**
   - Config `browser.driver: chrome` needs the `mcp__claude-in-chrome__*` tools in **your own** tool list (use ToolSearch to check). Subagents only get them from the main session.
   - If they're missing:
     - and `mcp__playwright__*` tools exist, fall back to `playwright`;
     - otherwise, tell the user: "Browser checks need Claude in Chrome: run `/chrome` (or restart with `claude --chrome`), or configure the Playwright MCP server."
   - Neither is available on WSL or CI, except Playwright.
2. **Check the URL and how to start the app.** `browser.base_url` must be set, and so must `commands.env_up`, unless the app is already running.
3. **No browser available and the user isn't present:** convert those ACs to `manual` in Gate Notes. They'll need sign-off in P7. Never count them as passing.
4. Record the result: `S set browser_driver <chrome|playwright|none>`.

**Gate.**
- The gate is **mandatory** if `PROTECTED_EXCEPTIONS` isn't `none`, if the browser preflight needs user action, or if a plan review ended with unresolved BLOCKING findings.
- Otherwise `--gate plan|all` pauses here.
- On approval:
  - set `GATE: APPROVED` and add a Gate Notes line;
  - run `S allow <path>` for each exception the human approved.
- On revise: `S set plan_cycle_start <S get plan_review_round>`, then re-run P2 with the feedback file in READ, then P2b.
- If no pause applies: set `GATE: APPROVED` yourself, with "auto (gate none)" in Gate Notes.

### P3 Implement (iteration 0)

**bugfix: two steps.**

1. **P3a.**
   - Phase: `implement`. Agent: `devloop-implementer` with `Step: P3a`.
   - READ: `D/task.md`, `D/investigation.md`, `D/plan.md`.
   - WRITE: `REPRO_TEST` and `D/fix-log.md`.
   - If BLOCKED with "passes before the fix" or "does not run", re-run once, then escalate `no_repro`.
2. **You** run `R test_single --path <REPRO_TEST> --label repro-base`. It's a **real failure** only if all of these hold:
   - `EXIT` is a number other than 0, 3, 5, 6 or `TIMEOUT`;
   - `TESTS_RAN` isn't 0;
   - `LOAD_ERROR: no`;
   - the log (`grep` it) shows an assertion failure for the stated reason.
   
   Otherwise:
   - exit 0, or a load error → re-run P3a once, quoting the problem, then escalate `no_repro`;
   - NO_TESTS_RAN → escalate `no_repro`.
3. Pin it: `S protect <REPRO_TEST>`. From now on, nobody can change it.
4. **P3b.**
   - Phase: `implement`. Agent: `devloop-implementer` with `Step: P3b`.
   - Same READ list as P3a.
   - WRITE: source files, new tests, and the `## Iteration 0` section of `D/fix-log.md`.

**port and feature: one step.** Run `devloop-implementer` with `Step: P3`.

**Verify:**
- `git status` shows changes beyond the repro test.
- fix-log has `ITERATION: 0`.

Then run `S protect <each new test file from Run-Scoped Protection>` to pin them.

**Services.** If `commands.env_up` is set, run `R env_up` once now. It stays up for the whole run. Run `R env_down` at every pause, escalation and end.

### P4 Test
- Phase: `test`. Agent: `devloop-tester`.
- READ: `D/task.md`, `D/investigation.md` (the Baseline section), `D/plan.md`, `D/fix-log.md`.
- WRITE: `D/test-report.md`.

**Verify:**
- `ITERATION` equals state.
- `R failhash D/test-report.md` exits 0 and equals `FAILING_IDS_HASH`. Exit 2 means the section is missing, which is a protocol defect.
- `VERDICT` is PASS ⇔ Failing IDs is `none`.

Archive it: `cat D/test-report.md > D/history/test-report-<n>.md`.

- Test FAIL → loop control (§6), without running P4b this iteration.
- Test PASS → P4b if it applies, otherwise loop control.

### P4b Verify UI in the browser
Runs only if any AC is `browser` and `S get browser_driver` isn't `none`.

- Phase: `verify`. Agent: `devloop-browser-tester`.
- READ: `D/plan.md` (ACs and UI Verification), plus the previous `D/browser-report.md` if one exists.
- WRITE: `D/browser-report.md`.
- In the prompt, give the base URL, the driver and the iteration number.
- Never run two browser agents at once: they share one browser.

**Verify:**
- `ITERATION` equals state.
- `VERDICT` is PASS ⇔ Failing IDs is `none`.

**BLOCKED cases:**
- `login required` or `JS dialog`, with driver `chrome`:
  1. `S phase paused verify`. Leave the app running (no `env_down`), so the login session survives;
  2. ask the user to log in, or dismiss the dialog, in that Chrome window;
  3. resume re-runs P4b. This doesn't consume an iteration.
  
  If the same BLOCKER comes back after a resume, or the driver is `playwright` (a human can't log in there), convert the affected checks to `manual` in plan.md Gate Notes and continue. They'll need sign-off in P7.
- `no browser tools` → `S set browser_driver none`; the browser ACs go to manual sign-off in P7.
- `app not reachable` → run `R env_up` once more, retry P4b once, then escalate `agent_blocked`.

Archive it: `cat D/browser-report.md > D/history/browser-report-<n>.md`. Then go to loop control.

### P5 Fix
1. Run `S iter`. Exit 4 → escalate `cap_exhausted`.
2. Save `cat D/fix-log.md > D/history/fix-log-before-<n>.md`.
3. Phase: `fix`. Agent: `devloop-fixer`.
4. READ:
   - `D/task.md`, `D/plan.md`, `D/fix-log.md`;
   - plus whichever triggered this round: `D/test-report.md`, `D/browser-report.md`, `D/gate.md`, or each failing `D/review-<lens>.md`.
5. Items to address: the exact Failing IDs, gate items or BLOCKING finding IDs.

**Verify:**
- There's a new `## Iteration <n>` entry.
- Everything from the first `## Iteration` line up to the new entry is byte-identical to the saved copy.

Then → P4.

### P6 Code review (all lenses, in parallel, fresh context)
1. `r = (S get review_round, or 0) + 1`.
2. Write the diff, excluding lockfiles:
   ```
   X=(-- . ':!.devloop' ':!*.lock' ':!package-lock.json' ':!pnpm-lock.yaml' ':!yarn.lock' ':!go.sum')
   { git diff --stat <base> "${X[@]}"; echo; git diff <base> "${X[@]}";
     git ls-files -o --exclude-standard "${X[@]}" | while read -r f; do git diff --no-index /dev/null "$f"; done; } > D/diff.patch
   ```
3. `h = R diffhash`, then `S set reviewed_diff <h>`.
4. If `wc -l D/diff.patch` is over 3000, tell the reviewers: "large diff: review per file".
5. `S phase review reviewers`.
6. In **one message**, start every lens agent with `Stage: code`, `ITERATION`, and `DIFF_HASH=<h>`.
   - READ: `D/task.md`, `D/plan.md`, `D/diff.patch`, plus `D/history/review-<lens>-<r-1>.md` if r > 1.
   - DO NOT READ: `investigation.md`, `fix-log.md`, `test-report.md`, `browser-report.md`.
   - WRITE: `D/review-<lens>.md`. The logic lens also writes `D/tamper.md`; it runs the tamper check itself.

**Verify each lens:**
- `LENS`, `ITERATION` and `DIFF_HASH` match.
- `VERDICT: PASS` ⇔ `BLOCKING_ISSUES: 0`.
- **logic:** every tamper finding has a justification row. `TAMPER: NOT_RUN` → re-run the logic lens once.

Archive each with `cat D/review-<lens>.md > D/history/review-<lens>-<r>.md`, then `S set review_round <r>`.

**The combined review passes only if every lens is `VERDICT: PASS`.**

### P7 Exit gate (you run this, not a subagent), then finalize
0. `S phase gate`. Builds and tests here don't trigger the drift warning.
1. If `D/gate.md` exists, `cat D/gate.md > D/history/gate-<k>.md`, where `k` = the number of existing `history/gate-*.md` files + 1. Then `: > D/gate.md`.
2. **Run each step** with `R <step> --label gate`, in this order:
   - `build`, `typecheck`, `lint`, `test`, `e2e`;
   - **bugfix:** `test_single --path <REPRO_TEST>`.
   
   Append one line per step to `D/gate.md`: `<step>: EXIT <x> TESTS_RAN <n> LOG <path>`.
   
   A step **passes** only if:
   - it exits 0; or
   - it is `test`, exits non-zero, and the log shows that every failing id is in the baseline's PRE_EXISTING or `known_flaky` lists. If you can't tell, it **fails**.
   
   SKIPPED (exit 3) is listed as not verified. NO_TESTS_RAN is a failure.
3. **Integrity.**
   - `S verify-pins` must exit 0.
   - `bash .claude/hooks/devloop-tamper-check.sh --task <id> > D/tamper.md` must be CLEAN. If it isn't, every finding must already be justified in `review-logic.md`. `PIN_*` findings are never acceptable.
4. **Freshness.** `R diffhash` must equal `S get reviewed_diff`. If it doesn't, the code changed after the review: go back to P4.
   - No iteration is consumed.
   - Count these with `S set freshness_retries <n>`. On the second mismatch, escalate `protocol_failure`: something outside the loop is changing files. Add the culprit to `drift_ignore`.
5. **Coverage.**
   - Every unit/e2e AC is PASS in the latest test report.
   - If `S get browser_driver` isn't `none`: every browser AC is PASS in the latest browser report, and that report's `ITERATION` equals the current iteration. If the driver is `none`, those ACs go to step 7 instead.
   - **port:** every parity item is PASS.
6. **If steps 2, 3 or 5 fail:**
   1. append `## Failing IDs` to `gate.md`, as `gate:<step>` and `ac:<id>`;
   2. compute `g = R failhash D/gate.md`. If it equals `S get last_gate_hash` → escalate `no_progress`;
   3. otherwise `S set last_gate_hash <g>`, then P5 with `gate.md` in READ. P5 runs `S iter`, so the cap applies.
7. **Manual sign-off.**
   - If any AC is `manual`, or a browser AC couldn't be checked, and config `gate.manual_signoff` isn't `false`:
     1. `S phase paused gate` and `S set awaiting signoff`;
     2. list those ACs with how to check each one;
     3. stop.
     4. On approve, write `D/signoff.md` with who approved, which ACs, and the user's words. Run `S set awaiting none`, then continue at P7 step 8. Don't re-run steps 1–6.
     5. If they reject an AC, write it to `gate.md` as `ac:<id>` and continue at step 6.
   - If `manual_signoff: false`, list them as Not verified.
8. `--gate all` → pause.
9. Run `R env_down`.
10. **Finalize.**
    - `S phase finalize` **refuses** (exit 2) if any pinned test changed, or if the code differs from what was reviewed. This is checked again even after a pause, so edits made while waiting are caught.
      - "code changed after review" → back to P4. That counts as a freshness retry (step 4), not an iteration.
      - pin problems → treat them as `gate:pins` in step 6. Never use `--force` unless a human has decided to.
    - Phase: `finalize`. Agent: `devloop-finalizer`.
    - READ: the list in its instructions. Pass it `ITERATIONS_USED`, plus `Lenses: <S get lenses>`.
    - WRITE: `D/summary.md` and `D/pr.md`.
    - **Verify:** the Verification section matches the step lines in `gate.md`, and "Not verified" covers every SKIPPED step and every manual or browser AC that wasn't checked.
11. `S end resolved`.

## 6. Loop control (after P4, or P4b when it runs)

```
H = R failhash D/test-report.md [D/browser-report.md if P4b ran this iteration]    (exit 2 -> protocol defect, re-run that agent)
if H == none and every report used has VERDICT: PASS:   S set last_fail_hash none; -> P6
elif H == none:                        protocol defect (FAIL with no Failing IDs) -> re-run that agent once
elif H == S get last_fail_hash
     and loop.stop_on_repeat_failure != false:          -> ESCALATE no_progress
else:                                  S set last_fail_hash H;   -> P5   (cap enforced by S iter)
```

After P6:
- **All lenses PASS** → P7.
- **Any lens FAIL** → P5 with every BLOCKING finding id from every failing lens, as one round. This consumes one iteration.

Then the run goes P4 → P4b → P6 again, with **all** lenses, because the code changed.

Rules:
- A BLOCKING finding is cleared only when a later review confirms it.
- NON-BLOCKING findings never re-enter the loop; they go to follow-ups.

## 7. Escalation

1. Run `R env_down`. Then:
   - `cap_exhausted` or `no_progress` → `S phase paused fix`, so resume goes straight to another fix round;
   - anything else → `S phase paused <current phase>`.
2. Write `D/escalation.md`:
   ```
   # dev-loop escalation: <id>
   ## Headline
   <cap_exhausted|no_progress|no_repro|plan_blocked|protocol_failure|agent_blocked|human_abort> — one sentence
   ## State
   mode, iteration <n>/<max>, base <sha>, last test / browser VERDICT, last VERDICT per review lens
   ## Still failing
   | Item | First seen (iteration) | Error excerpt (≤3 lines) |
   ## What was tried
   | Iteration | Trigger (test/browser/gate/review) | Diagnosis | Result |   (one row per fix-log entry)
   ## Verified vs NOT verified
   ## Next action for a human
   concrete suggestion + commands:
     /dev-loop --resume <id> --max-iter <n+2>     /dev-loop --resume <id> abort
   ```
3. Print the Headline and Next action.

## 8. Pausing and resume

**Pause.**
1. Run `S phase paused <P>`. `P` is stored as the role; read it back with `S get role`.
   | Pause | P | `approve` does | `revise` re-runs |
   |---|---|---|---|
   | after investigation | `investigate` | P2 | P1 |
   | after plan | `plan` | P3 | P2 |
   | browser login/dialog | `verify` | P4b again | — |
   | sign-off, or before finalize | `gate` | P7 from step 8 (signoff), else finalize | — |
   | escalation | `fix` or the failing phase | P5 (cap/no-progress), else that phase again | — |
2. Run `R env_down`, except for a browser login pause.
3. Tell the user:
   - the artifact to review;
   - a summary of at most 10 lines;
   - the resume commands: `/dev-loop --resume <id> approve | revise "<feedback>" | abort`.
4. Stop your turn.

**Resume.**
1. Run `S resume <id>`. It prints the state and every artifact header.
2. If HEAD has moved since the base and the run's own commits don't explain it, warn the user and ask.
3. Apply the answer:
   - `approve` → do what the table says for `S get role`.
   - `revise "<fb>"` → write `D/human-feedback-<k>.md`, then re-run that phase with it in READ. This doesn't consume an iteration. If that phase is `plan`, first run `S set plan_cycle_start <S get plan_review_round>`, and run P2b afterwards.
   - `abort` → `S end aborted`. This works even if the task folder is damaged: `end` then just removes `.devloop/ACTIVE`.
   - `--max-iter N` → `S set max_iterations N`, then `S set last_fail_hash none` and `S set last_gate_hash none`, so the next fix round isn't treated as "no progress".
4. If services are configured, run `R env_up` again before P4 or P4b.
5. Continue at the first incomplete step:
   ```
   investigation → plan → plan reviews for the current plan: every lens file is non-empty, its ROUND equals `S get plan_review_round` (and is > 0),
     and its VERDICT is PASS, or the human accepted the findings at the gate
   → plan GATE APPROVED → [bugfix: repro pinned] → fix-log Iteration 0
   → test-report for the current iteration with VERDICT PASS
   → browser-report for the current iteration with VERDICT PASS (if browser ACs and a driver)
   → review-<lens>.md for every lens, VERDICT PASS, each with DIFF_HASH == R diffhash → P7
   A report with VERDICT FAIL is not "complete": continue with loop control (§6) from it.
   ```

## 9. Rules (non-negotiable)

1. **Never edit code or tests.** Changes are made by agents. State changes go through `S`. Project commands go through `R`.
2. **Never weaken exit criteria.**
   - Don't waive checks.
   - Don't treat SKIPPED, NO_TESTS_RAN or an unverified browser or manual AC as passing.
   - Don't accept a skipped, deleted or changed test.
   - Never tell an agent it may relax a test.
3. **Recompute, don't trust.** Verdicts come from header fields, `R failhash` and `R diffhash`, `S verify-pins`, and commands you ran yourself.
4. **Keep code reviewers isolated.** They get only the P6 inputs. Never summarise implementer reasoning, or another lens's findings, into a reviewer's prompt.
5. **One phase at a time, in the foreground.** The only parallel work is the read-only lens reviewers inside P2b and P6. Never run two code-editing agents, or two browser agents, at once.
6. **Never commit, push or open a PR**, unless `finalize.commit: true`. Even then, only the finalizer commits, and nobody pushes.
7. **Final message.** Keep it short:
   - outcome;
   - iterations used out of max;
   - the `gate.md` step lines;
   - browser checks run (driver, passed/total);
   - review results: plan-review rounds used, and the code-review verdict for each lens;
   - the **Not verified** list, always, even if it's empty;
   - the paths to `summary.md` and `pr.md`.
