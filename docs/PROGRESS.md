# Current Milestone

Milestone 3 — Scenario Mode

# Goal

Let payroll operators model employee or department raises, understand exact monthly and annual impact, and save or discard plans without changing real payroll data.

# Current Status

Milestone 3 is implemented and verified locally. Scenario previews calculate from the selected period’s saved payroll snapshot when available, otherwise from effective salaries and approved adjustments. Saved scenarios retain their own item snapshots.

# Completed

- [x] Employee raise scenarios.
- [x] Department raise scenarios.
- [x] Integer basis-point parsing and deterministic half-up paise rounding.
- [x] Live baseline, projected payroll, monthly impact, and annualized impact preview.
- [x] Saved scenario headers and affected-employee item snapshots.
- [x] Discard workflow that deletes only scenario records and writes an activity event.
- [x] Backend isolation tests prove preview/save/discard do not mutate payroll or compensation.
- [x] Scenario period stays in URL state and switching periods cannot display a scenario from another month.
- [x] 64 financial/backend tests, lint, typecheck, formatting, production build, persisted-data smoke, and real-browser workflow.

# In Progress

- None. Milestone 3 verification and handoff are complete.

# Next Actions

1. Implement Milestone 4 AI Payroll Copilot as a proposal layer over controlled PayFlow tools.
2. Bind every AI proposal to an exact data version and deterministic preview.
3. Require explicit human confirmation before any existing mutation can run.

# Blockers

- None. Local services are configured and working.

# Important Current Context

Scenarios are snapshots only. There is deliberately no “apply scenario” mutation in Milestone 3. October’s browser-verified 8.25% Engineering scenario was discarded after verification; its saved/discarded activity events remain, while payroll and compensation stayed unchanged. All money remains integer paise.

# Last Verified

2026-09-27 (Asia/Kolkata): 64 tests, lint, typecheck, format check, production build, read-only Convex smoke, live employee/department preview, saved eight-person breakdown, discard confirmation, and source-data isolation.
