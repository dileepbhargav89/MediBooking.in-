# dev-loop

A multi-agent development loop for Claude Code:

**investigate → plan → 4-lens plan review → (you approve) → implement → test → verify UI in a browser → fix ⟲ retest (capped) → 4-lens code review → exit gate → finalize**

- **One agent per phase.** Every phase runs in its own subagent, and phases hand work to each other through files in `.devloop/<task-id>/`.
- **Three modes.**
  - `bugfix`: a failing repro test is written and pinned before the fix.
  - `port`: API mapping and a parity checklist.
  - `feature`: acceptance criteria, each with a stated way to verify it.
- **Stack-agnostic.** Every command comes from `.devloop/config.yaml` and runs through one runner script.

## What's in the package
```
.claude/skills/dev-loop/SKILL.md            orchestrator (the /dev-loop skill)
.claude/skills/dev-loop/templates/*.md      investigation, plan, plan-review, fix-log, test-report, browser-report, review, summary
.claude/agents/devloop-<role>.md            investigator, planner, implementer, tester, browser-tester, fixer, finalizer
.claude/agents/devloop-review-<lens>.md     logic, regression, integration, performance reviewers (plan + code stage)
.claude/hooks/devloop-lib.sh                shared helpers
.claude/hooks/devloop-state.sh              run state: phases, iteration cap, protection + hash pins
.claude/hooks/devloop-run.sh                runs configured commands: timeouts, logs, short summaries, env up/down
.claude/hooks/devloop-guard.sh              PreToolUse: per-phase write policy, protected/pinned tests
.claude/hooks/devloop-postedit-lint.sh      PostToolUse: fast per-file lint (non-blocking)
.claude/hooks/devloop-stop-check.sh         SubagentStop/Stop: artifact header validation, mid-run stop reminder
.claude/hooks/devloop-tamper-check.sh       diff-based detection of weakened, skipped or changed tests
.claude/hooks/devloop-integrity.sh          PostToolUse: restores pinned/protected tests and read-only phases after every tool call
.claude/settings.json                       hook wiring + permission rules for the two scripts
.devloop/config.example.yaml
```

## Install
1. Copy `.claude/skills/dev-loop/`, `.claude/agents/devloop-*.md`, `.claude/hooks/devloop-*.sh` and `.devloop/config.example.yaml` into your repo. Copy `.gitattributes` too, or add its lines to yours. **This matters on Windows:** without it, Git checks the scripts out with CRLF line endings and the hooks crash.
2. Merge `.claude/settings.json` into your own:
   - its `hooks` block;
   - its `permissions.allow` entries. These let the dev-loop scripts, read-only git commands, and edits under `.devloop/` run without an approval prompt each time.
   
   If you already have hooks for the same events, add these alongside them.
3. Set up the config:
   ```
   cp .devloop/config.example.yaml .devloop/config.yaml
   ```
   Then fill in `commands` (at least `test` and `test_single`), `protected_paths`, and `browser` if you have a web UI. The example file has blocks for Node, Python, Java and Go.
4. Add this to `.gitignore`:
   ```
   .devloop/*
   !.devloop/config.yaml
   !.devloop/config.example.yaml
   ```
5. **Restart Claude Code.** New agents and new hooks are only loaded at startup. Afterwards, run `/agents` and `/hooks` to confirm they're there.
6. **Requirements:**
   - bash 3.2+
   - git
   - `jq` or `python3`
   - `curl`, for waiting on the dev server
   
   On Windows, use Git Bash or WSL. The scripts convert `C:\` paths themselves.

## Specialist reviews (two stages)
Four reviewers look at every change, each through one lens. They run **in parallel** (they only read), once on the plan and once on the code:

| Lens | Asks | Typical BLOCKING finding |
|---|---|---|
| logic | Is it correct for every input? Does it match the plan? Is it secure? Were tests tampered with? | Off-by-one on an empty list; root cause not fixed; unjustified test change |
| regression | What that used to work could this break? | A changed default that 14 callers rely on, with no test guarding them |
| integration | Does it fit the modules, services, data and deployment around it? | A new column with no migration; a client still sending the old field name |
| performance | Will it stay fast and within resource limits at real scale? | N+1 queries on a per-request path, with the scale at which it breaks |

**Plan stage.**
1. After the planner writes `plan.md`, the four reviewers check it before any code exists.
2. If any of them raises a BLOCKING finding, the planner revises the plan and records a response to each finding. Then the plan is reviewed again, up to `review.plan_max_rounds` rounds (2 by default).
3. You see the reviewed plan at the gate, with the open questions. If BLOCKING findings are still unresolved, the gate is mandatory, even with `--gate none`.

**Code stage.** After the tests (and browser checks) pass, the same four review the diff. If any lens raises a BLOCKING finding, all of them go to the fixer as one round. The code is then re-tested and re-reviewed by all four, because it has changed.

**Keeping findings honest.** A BLOCKING finding must cite a concrete line and a concrete failure scenario. Anything without one is MAJOR at most, and is reported but doesn't loop.

**Choosing lenses.** Turn lenses off in `review_lenses`, for example dropping `performance` for a docs-only repo. `logic` is always on.

## Browser verification (Claude in Chrome)
Use this for acceptance criteria a unit test can't see: real rendering, layout, a complete UI flow. The planner marks those ACs `Verified by: browser` and writes exact steps and the expected visible result. After the tests pass, the `devloop-browser-tester` agent:
1. opens a **new tab**;
2. follows the steps;
3. reads what's actually on the page;
4. checks the console and network for errors;
5. writes `browser-report.md`.

Failing checks go to the fixer exactly like failing tests do.

**Turning it on:**
- **Claude in Chrome (default driver).** Each developer runs Claude Code with `claude --chrome`, or runs `/chrome` and picks "Enabled by default".
  - A project setting can't turn it on for you.
  - It needs a direct Claude plan and the Chrome extension.
  - It doesn't work in WSL or CI.
  - It uses your real Chrome, so your sign-ins are available.
- **Playwright MCP (headless or CI).**
  ```
  claude mcp add playwright -- npx -y @playwright/mcp@latest
  ```
  Then set `browser.driver: playwright`, or leave it as `chrome` and the orchestrator falls back to Playwright when Chrome isn't connected.
- Set `browser.base_url`, and set `commands.env_up` to start your dev server. The orchestrator starts it once and stops it on pause or finish.

**What the browser agent never does:**
- **Type credentials or real personal data.** If it hits a login wall it stops, you log in, and the run resumes.
- **Click through native `alert` or `confirm` dialogs.** These freeze the browser tools. If one appears, the run pauses for you.
- **Touch your other tabs.**
- **Mark an AC as passing when no browser was available.** If neither driver is available, browser ACs become `manual` and need your sign-off before finalize.

Site-permission prompts from the extension appear in your session. That's why every phase agent runs in the foreground.

## Usage
```
/dev-loop "fix: /login returns 500 when the session cookie is expired" --mode bugfix
/dev-loop "port: src/legacy/rate_limiter.py to packages/core/src/rateLimiter.ts" --mode port
/dev-loop "feature: CSV export button on the Reports page" --mode feature --max-iter 5
/dev-loop --status
/dev-loop --resume <id> approve | revise "<feedback>" | abort
/dev-loop --abort
```

**Where the run pauses for you:**
- after the plan (default);
- when the plan wants to change an existing protected test;
- when the browser needs a login;
- before finalizing, if any AC needs manual sign-off;
- when the loop runs out of rounds or stops making progress. `escalation.md` explains what was tried.

When it finishes, read `.devloop/<id>/summary.md`. The PR description is in `pr.md`.

## What keeps the loop honest
- **Tests can't be weakened.**
  - Existing tests are protected.
  - The bugfix repro test is written alone, confirmed failing by the orchestrator, then hash-pinned.
  - New tests are pinned after implementation.
  - The guard blocks edits to all of these. The tamper check catches changes made by other means, such as Bash edits, skip markers, deleted assertions, snapshot rewrites or test-config changes.
- **Verdicts are recomputed.** The orchestrator runs the commands itself at the exit gate, recomputes the failure hashes, and checks that the code it finalizes is exactly the code that was reviewed (diff hash).
- **SKIPPED isn't passing.** Neither is "no tests ran", nor an AC nobody checked. All three are listed under **Not verified** in every summary.
- **The loop is bounded.** Every fix round counts toward `loop.max_iterations`, whatever triggered it: tests, the browser, the exit gate or the review. The run escalates early if the same failures come back twice.
- **Code reviewers are independent.** They see only the task, the plan and the diff, never the implementer's or fixer's reasoning, and never each other's findings.

## Configuration notes
- **Timeouts.** The Bash tool stops a call after 10 minutes. Steps over 540 s are started in the background and polled.
- **`known_flaky`.** Tests that fail intermittently before the run. They never fail the run and are always listed as not verified.
- **`drift_ignore`.** Build and test outputs that may appear during read-only phases. Add yours if a run reports "files changed during read-only phase".
- **Monorepos.** Use `{dir}` in `test_single`, or point the commands at a workspace runner such as `pnpm -r`, `nx affected` or `gradle`.
- **No test framework yet.** Set one up before using dev-loop, because `commands.test` is required.
- **Models per role** are set in each agent's frontmatter:
  - opus for the investigator, planner, fixer, and the logic and regression reviewers;
  - sonnet for the implementer, tester, browser tester, and the integration and performance reviewers;
  - haiku for the finalizer.

## Testing the kit itself
`devloop-tests/` holds the kit's own tests. Run them after changing any script.
- **`bash devloop-tests/selftest.sh`** — about 30 end-to-end checks of the hooks and state script, in a throwaway repo. Needs git, python3 and pytest.
- **`python3 devloop-tests/harness/<name>_harness.py`** — the labelled accuracy sets from the review:
  - `guard`: 80 bypass and harmless commands;
  - `run`: 59 test-runner outputs;
  - `tamper` (argument `A` or `B`): 68 test-tampering cases;
  - `failhash`: 29 cases.
  
  Each harness prints its accuracy.

## What changed in v4 (Phase 1: safety)
**Two layers now enforce the rules.**
- **The guard (before each tool call)** blocks what it can recognise, using a JSON "deny" decision.
- **The new integrity check (after each tool call)** looks at the result, whatever command produced it, and:
  - restores pinned tests from git, so a repro test or new test can't be changed;
  - restores protected tests that existed before the run, from the base commit;
  - in read-only phases, restores any changed project file from a snapshot taken when the phase began;
  - logs every case to `.devloop/<id>/integrity.log` and tells the agent;
  - feeds the log into the tamper check, so the reviewers see each attempt.

**Measured against 238 red-team commands** (Python heredocs, `cd tests && sed -i`, `find -exec`, `patch`, `tar`, nested shells, symlinks and so on):

| Target | Blocked by guard | Undone by integrity check | Reported only | Missed |
|---|---|---|---|---|
| Protected test, fix phase | 57 | 41 | 0 | 0 |
| Pinned repro test | 48 | 26 | 0 | 0 |
| Project files, read-only phase | 68 | 21 | 4 (new files, not deleted) | 0 |

**Other changes:**
- **Hooks can't lock up Claude Code.** Hooks run as `… || true` and decide through JSON, so a crash is harmless, for example on Windows CRLF line endings. `.gitattributes` keeps the scripts LF.
- **Pins are stored in git** (`refs/devloop/<id>/pins`), so editing or emptying `protected-hashes.txt` changes nothing. `protect ./x` works.
- **No usable base commit** now makes `diffhash` fail closed instead of returning a constant hash.
- **Finalize double-checks.** `phase finalize` refuses if a pinned test changed or the code differs from what was reviewed, including after a pause.
- **Protection is easier to get right.** `packages/*/tests` protects the whole subtree, a bare `tests` protects every `tests/` folder, and `start` warns about entries that match nothing.
- **Fewer false blocks from the guard**:
  - quoted `>` and heredoc report bodies;
  - `$((…))` and comments;
  - `git stash list` and `--snapshot-update=no`;
  - `rm` of caches;
  - files in the run's own folder.
- **The runner is more accurate.** It detects zero tests run (pytest skipped only, Go, Gradle, dotnet, Maven) and recognises more load errors. Its output is capped. If killed, it writes `KILLED` and stops its child processes.

**Measured results:**

| Check | Before | After |
|---|---|---|
| Guard: bypass attempts blocked | 68% | 98% (100% in macOS/Windows mode) |
| Guard: harmless commands wrongly blocked | 13% (review set); about 10 found by the red team | 0 of 30; 0 of 88 |
| Runner: test-count accuracy, 59 outputs | 71% | 100% |
| Hook time | guard 200 ms on Bash | guard 117–192 ms, integrity check about 100–130 ms |

**Not covered yet (Phase 2):**
- Detecting changed expected values inside tests that aren't pinned or protected. Tamper-check accuracy is 53%, or 81% inside a run.
- Normalising the failure hash.

## Limitations
- **The guard's command parsing is heuristic.** The integrity check after each tool call is what guarantees pinned and protected tests and read-only phases. It can't stop a determined process running under your own user account from changing git itself. Only OS-level isolation (a separate user or a container) is a hard boundary.
- **Tamper detection uses language heuristics.** The logic reviewer must justify every finding, except `PIN_*` findings, which can never be justified.
- **One active run per working tree.** For parallel runs, use separate `git worktree`s.
- **Fail-open.** If config, state, `jq` or `python3` is missing, or a run is stale, the hooks allow everything with a warning. `DEVLOOP_GUARD=off` and `DEVLOOP_LINT=off` turn them off.
- **Browser runs need a real browser session.** Claude in Chrome runs in your own visible Chrome and won't work unattended past a login, CAPTCHA or native dialog. Use Playwright and a test account for unattended runs.
