---
ARTIFACT: browser-report
TASK: {{task_id}}
MODE: <bugfix|port|feature>
ITERATION: <n>                 # must equal state iteration
STATUS: <COMPLETE|BLOCKED>     # BLOCKED = could not verify (no browser tools, login wall, dialog, app not reachable)
VERDICT: <PASS|FAIL>           # BLOCKED => FAIL
BLOCKER: none
DRIVER: <chrome|playwright|none>
FAILED: <count>                # number of lines in "Failing IDs"
---
<!-- PASS iff every UI check in plan.md "UI Verification" is PASS, and the smoke routes load with no console
     errors and no failed app requests (4xx/5xx), unless config browser.fail_on_console_errors is false.
     Evidence is what you READ on the page (text, element, URL), never what you expected to see. -->

# Browser Report — iteration {{n}}

## Environment
- Base URL: {{url}} — reachable: yes/no
- Driver: {{chrome | playwright}}; tab: {{new tab created for this run}}

## Failing IDs
<!-- ui:<check id> for failed checks, ui-smoke:<route> for smoke failures. "none" if empty. -->
- {{id}}

## UI Checks
| Check id | AC | Result (PASS / FAIL / BLOCKED) | Evidence (observed text/element/URL) | Console errors / failed requests |
|---|---|---|---|---|

## Smoke Routes
| Route | Loads | Console errors | Failed requests |
|---|---|---|---|

## Failures
### U1 `ui:{{check id}}`
- Step that failed:
- Expected:
- Observed:
- Console / network excerpt (≤ 10 lines):

## Not verified
<!-- Checks you could not perform, and why. -->
