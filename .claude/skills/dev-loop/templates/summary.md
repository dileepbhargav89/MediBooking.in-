---
ARTIFACT: summary
TASK: {{task_id}}
MODE: <bugfix|port|feature>
STATUS: <COMPLETE|INCOMPLETE|BLOCKED>
FINAL_VERDICT: <PASS|FAIL>       # PASS only if every enabled code-review lens is PASS (FAIL if any never ran)
ITERATIONS_USED: <n>/<max>
BASE_COMMIT: <sha>
HEAD: <sha|uncommitted>
TAMPER: <CLEAN|SUSPICIOUS|NOT_RUN>
BLOCKER: none
---

# Summary — {{title}}

## Outcome
{{2–4 plain sentences: what was done, whether it works, what remains}}

## Changes
| File | Change |
|---|---|

## Verification
| Check | Result |
|---|---|

## [bugfix] Root Cause & Fix
- Cause:  - Fix:  - Repro test: `{{path}}`

## [port] Parity
{{X}}/{{Y}} items verified. Unsupported/deferred: …

## [feature] Acceptance Criteria
| AC | Status |
|---|---|

## Known Issues & Follow-ups

## Suggested Commit Message
```
{{type}}({{scope}}): {{subject}}

{{body}}
```

## Artifacts
investigation.md · plan.md · fix-log.md · test-report.md · browser-report.md · plan-review-<lens>.md · review-<lens>.md · tamper.md · gate.md · signoff.md
