---
ARTIFACT: plan
TASK: {{task_id}}
MODE: <bugfix|port|feature>
STATUS: <COMPLETE|BLOCKED>
BLOCKER: none
GATE: PENDING                 # planner writes PENDING; orchestrator sets APPROVED|REJECTED at the human gate
REPRO_TEST: <path|none>
FILES_TOUCHED: <count>
PROTECTED_EXCEPTIONS: none    # or comma-separated existing protected files that must change (needs human approval)
---
<!-- Planner is read-only. Every Change List row must trace to a finding, AC, or parity item. -->

# Plan — {{title}}

## Summary
{{2–3 sentences: what changes and why this approach}}

## Approach
- Chosen:
- Rejected alternatives (one line each, with reason):

## Change List
| # | File | Change | Why | Traces to (finding / AC / parity id) |
|---|---|---|---|---|

## Test Strategy
| New/changed test | Covers | Expected before change | Expected after |
|---|---|---|---|
- Commands the tester runs: (from config; note any that are SKIPPED)

## Run-Scoped Protection
New test files. The orchestrator pins them (`devloop-state.sh protect`) after implementation; after that nobody may change them:
- `{{path}}`

## Protected Exceptions
<!-- Only if an EXISTING protected file must change (e.g. feature intentionally changes behavior an old test pins).
     Each entry: path — exact change — justification. The human approves at the gate;
     the orchestrator then runs `devloop-state.sh allow <path>`. Fixer never gets exceptions. -->
- none

## [bugfix] Fix Sequence
1. Implementer (P3a) writes ONLY the failing test at REPRO_TEST. The orchestrator runs it, confirms it FAILS, and pins it.
2. Implementer (P3b) makes the minimal fix: {{files}}
3. `test_single` on REPRO_TEST passes; full suite has no new failures.

## [port] API Mapping
| Source | Target | Status (MAPPED / ADAPTED / UNSUPPORTED / DEFERRED) | Notes |
|---|---|---|---|

## [port] Parity Checklist
- [ ] P1 {{behavior}} — verified by {{test path | method}}

## Acceptance Criteria
<!-- All modes. Verified by: unit | e2e | browser | manual.
     unit/e2e → name the test. browser → describe it under UI Verification. manual → a human signs off before finalize.
     Prefer unit/e2e; use browser only for behaviour a test cannot see (layout, real rendering, end-to-end UI flow). -->
| ID | Criterion (Given/When/Then) | Verified by | Test path / UI check id |
|---|---|---|---|

## UI Verification
<!-- Only if any AC is "browser". Delete otherwise. Never real credentials or real personal/payment data. -->
- Base URL: from config `browser.base_url` (override: {{url}})
- Login needed: no | yes — {{how; a human logs in, the agent never types credentials}}
| Check id | AC | Start URL/route | Steps (click/type/navigate) | Expected (visible text / element / URL) | Test data |
|---|---|---|---|---|---|
- Routes for a smoke check (load, no console errors, no failed requests): {{/route, /route}}

## Risks & Rollback
## Definition of Done
- [ ] All Change List rows done  - [ ] Tests per strategy pass  - [ ] Mode checks pass  - [ ] Review PASS

## Gate Notes
<!-- Human / orchestrator: approval decision, edits requested, approved exceptions. -->
