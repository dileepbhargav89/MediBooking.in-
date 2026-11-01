---
ARTIFACT: investigation
TASK: {{task_id}}
MODE: <bugfix|port|feature>
STATUS: <COMPLETE|BLOCKED>
BLOCKER: none
CONFIDENCE: <HIGH|MEDIUM|LOW>
BASELINE_FAILURES: <count|NOT_RUN>
REPRO_TEST: <repo-relative path|none>
---
<!-- Header rules: one value per key; any "<...>" left in place FAILS validation.
     BLOCKER: one line, required (not "none") when STATUS is BLOCKED.
     REPRO_TEST: bugfix only (proposed NEW file path), otherwise "none".
     Delete the [mode] sections that do not apply. Cite evidence as path:line.
     Read-only phase: write nothing outside .devloop/{{task_id}}/. -->

# Investigation — {{one-line title}}

## Request
- Verbatim: > {{task text}}
- Interpretation: {{1–2 sentences; put ambiguities in Open Questions}}

## Environment & Commands
| Concern | Value | Evidence |
|---|---|---|
| Language / framework | | e.g. package.json |
| Test (full / single) | | .devloop/config.yaml or inferred from … |
| Lint / typecheck / build | | |

## Baseline Test Run
Command: `…` → exit N (or NOT_RUN: reason).
Pre-existing failures (tester will classify these as PRE_EXISTING):
- `test id` — one-line error

## Relevant Code
| path:line | Symbol | Role in the problem |
|---|---|---|

## Findings
1. {{fact}} — `path:line`
<!-- Unverified ideas must be prefixed "HYPOTHESIS:". -->

## [bugfix] Reproduction
1. {{step}}
- Expected:
- Actual: {{error / stack excerpt, ≤ 15 lines}}
- Reproduced locally: yes/no — how

## [bugfix] Root Cause
{{mechanism with path:line}}. Why existing tests miss it:

## [bugfix] Proposed Failing Test
- Path: {{= REPRO_TEST; prefer a NEW file — existing protected tests cannot be edited}}
- Assertion that fails today and passes after the fix:

## [port] Source & Target
- Source: {{repo/path@ref, language/runtime}}
- Target: {{path, language/runtime, conventions to follow}}

## [port] Source API Inventory
| Source symbol | Kind | Signature | Behavior notes (edge cases, errors, side effects) | Source tests |
|---|---|---|---|---|

## [port] Platform Gaps
| Source feature | Target equivalent | Risk |
|---|---|---|

## [feature] Extension Points
| path | How the feature hooks in |
|---|---|

## [feature] Draft Acceptance Criteria
- AC1: Given … When … Then …

## Risks & Unknowns
## Open Questions
## Out of Scope
