---
ARTIFACT: fix-log
TASK: {{task_id}}
MODE: <bugfix|port|feature>
ITERATION: <n>                  # number of the latest entry; 0 = implementer
STATUS: <IN_PROGRESS|BLOCKED>   # IN_PROGRESS while the loop runs; BLOCKED needs a BLOCKER line
BLOCKER: none
---
<!-- APPEND-ONLY journal of every code change in the run.
     Implementer creates the file and writes "## Iteration 0". Fixer appends "## Iteration N"
     (N = state iteration) and updates ITERATION/STATUS in the header. Never edit earlier entries.
     If the only viable fix is in a protected path: STATUS: BLOCKED, explain, stop. -->

# Fix Log

## Iteration 0 — implementation
- Plan steps completed: {{1, 2, 3}}; deviations: {{none | what & why}}
- [bugfix] P3a: repro test written at `{{path}}` (nothing else). The orchestrator runs it, confirms it fails, and pins it.
- [bugfix] P3b: fix applied after the repro test was pinned.
- Changes:
  | File | Change |
  |---|---|
- New test files (orchestrator protects these for later iterations):

<!-- Example of a fixer entry (iterations 1+). The implementer deletes this example block. -->
## Iteration {{N}}
- Addresses: test-report iteration {{N-1}} — F1, F2
- Diagnosis: {{root cause, path:line}}
- Changes:
  | File | Change |
  |---|---|
- Alternatives rejected:
- Protected paths touched: NO
- Expected effect:
