# Current Milestone

Milestone 2 — Payroll Operations

# Goal

A reviewable payroll workflow with explicit human decisions, effective-dated compensation, immutable saved results, and understandable activity history.

# Current Status

Milestone 2 is implemented and verified locally. September remains ready for review at ₹21,68,450.50, October remains a draft with its existing ₹20,000 Ananya bonus, and all existing compensation history was migrated without changing payroll items or totals.

# Completed

- [x] New adjustments start pending and affect payroll only after approval.
- [x] Approve/reject mutations revalidate state, company, period, and projected payroll; rejected entries never affect totals.
- [x] Salary revisions carry an effective month, reason, and audit metadata; calculations select the salary applicable to the payroll period.
- [x] Idempotent migration backfilled 25 compensation revisions, then aligned 23 starting records to employee joining months; saved snapshots were untouched.
- [x] Payroll review supports explicit ready-for-review → approved → processed transitions with confirmation dialogs and activity events.
- [x] Processed means a locked PayFlow record; no bank action is implied or performed.
- [x] Full activity page shows up to 100 payroll, adjustment, employee, and workspace events.
- [x] Period selection is validated URL state and survives reloads and navigation.
- [x] People details explain the selected-period salary and show compensation and payroll timelines.
- [x] 53 financial/backend tests, lint, typecheck, formatting, production build, local migration, and real-browser UI checks pass.

# In Progress

- None. Milestone 2 verification and handoff are complete.

# Next Actions

1. Start Milestone 3 scenario mode with isolated, non-mutating salary simulations.
2. Add scenario impact views by employee and department.
3. Preserve the same explicit apply/revalidate boundary before any scenario can change compensation.

# Blockers

- None. Local services are configured and working.

# Important Current Context

All money is paise. Payroll items are immutable snapshots. Compensation revisions are the source for period salary; `employees.baseMonthlySalary` remains a compatibility/current-value field. September is intentionally still ready for review so the approval UI remains demonstrable. No browser verification changed a financial record during M2. No authentication, bank rails, compliance, PDF, AI, or external integrations are present.

# Last Verified

2026-09-27 (Asia/Kolkata): 53 tests, lint, typecheck, format check, clean production build, idempotent migration, live local Convex data, approval and adjustment dialogs, compensation history, activity history, and October URL persistence across reload/navigation.
