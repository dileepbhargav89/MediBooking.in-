---
ARTIFACT: plan-review
LENS: <logic|regression|integration|performance>
TASK: {{task_id}}
MODE: <bugfix|port|feature>
ROUND: <n>                    # plan-review round (from your prompt)
STATUS: <COMPLETE|BLOCKED>
VERDICT: <PASS|FAIL>
BLOCKING_ISSUES: <count>
BLOCKER: none
---
<!-- Written to .devloop/<id>/plan-review-<lens>.md. You review the PLAN, before any code exists.
     BLOCKING = the plan, if implemented as written, would be wrong or unsafe through your lens, and you can say why
     (cite the plan row and the code path:line it touches). Missing tests for a risk you identified is BLOCKING.
     Preferences, alternatives and "consider" items are MAJOR/MINOR. Finding ids: PLOG-n, PREG-n, PINT-n, PPERF-n. -->

# Plan review ({{lens}}) — {{title}}

## Checks performed
<!-- The lens checklist items you examined and the code you read to check them. -->

## Findings
| ID | Severity (BLOCKING/MAJOR/MINOR/NIT) | Plan row / section | Code path:line | Issue | Required change to the plan |
|---|---|---|---|---|---|

## Missing tests
<!-- Tests the plan should add for risks in your lens: path, scenario, expected result. "none" if none. -->

## Questions for the human
<!-- Decisions only a human can make (non-blocking). "none" if none. -->

## Previous round
<!-- Only on round 2+: each earlier BLOCKING id → RESOLVED / STILL OPEN, with the plan section that resolves it. -->
