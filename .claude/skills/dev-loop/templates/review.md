---
ARTIFACT: review
LENS: <logic|regression|integration|performance>
TASK: {{task_id}}
MODE: <bugfix|port|feature>
ITERATION: <n>                # the iteration of the code you reviewed (from your prompt)
DIFF_HASH: <hash>             # from your prompt; the orchestrator compares it before finalizing
STATUS: <COMPLETE|BLOCKED>
VERDICT: <PASS|FAIL>
TAMPER: <CLEAN|SUSPICIOUS|NOT_RUN|N/A>   # logic lens runs the tamper check; other lenses write N/A
BLOCKING_ISSUES: <count>
BLOCKER: none
---
<!-- Written to .devloop/<id>/review-<lens>.md. One file per lens; all four lenses review the same diff.
     VERDICT = FAIL iff any BLOCKING finding (logic lens: or any unjustified tamper finding).
     BLOCKING needs a concrete path:line AND a concrete failure scenario (inputs/state -> wrong result).
     Without a scenario it is MAJOR at most. Finding ids: LOG-n, REG-n, INT-n, PERF-n. -->

# Code review ({{lens}}) — {{title}}

## Scope
- Base `{{sha}}` → working tree; {{N}} files, +{{X}}/−{{Y}}; reviewed per file: yes/no

## Checks performed
<!-- The lens checklist items you actually examined, one line each, with what you looked at. -->

## Findings
| ID | Severity (BLOCKING/MAJOR/MINOR/NIT) | path:line | Issue | Failure scenario | Suggested fix |
|---|---|---|---|---|---|

## Previous round
<!-- Only if your prompt listed your lens's previous review: each earlier BLOCKING id → RESOLVED / STILL OPEN. -->

## [logic lens] Test Integrity
- Tamper check: {{CLEAN | SUSPICIOUS (n findings)}}
| Finding | Justified? | Reasoning |
|---|---|---|

## [logic lens] Plan Conformance
| Plan change row | In diff | Notes |
|---|---|---|

## Recommendation
{{One paragraph. If FAIL: the minimal list of required changes.}}
