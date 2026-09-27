# Data model

All money is safe integer **paise**; timestamps are Unix milliseconds. Convex supplies `_id` and `_creationTime`. The schema lives in `convex/schema.ts`; service and mutation code enforces business invariants.

## Implemented

### companies

Payroll workspace with name, slug, INR currency, India country, and createdAt. `by_slug` supports the idempotent `acme-studio` demo lookup. Company switching remains future work.

### employees

Current profile with company, employee code, name, email, department, title, employment type, joining date, active/inactive status, compatibility `baseMonthlySalary`, currency, and createdAt. Indexes: `by_company`, `by_company_code`. Calculation includes active people joined by the chosen month-end. Effective salary comes from compensation revisions; employment status is not effective-dated yet.

### compensationRevisions

Append-only monthly salary timeline with companyId, employeeId, monthlySalary, effectiveMonth, effectiveYear, reason, and createdAt. Indexes: `by_company`, `by_employee_period`. The newest record effective at or before a payroll period determines base pay. A write cannot predate joining, duplicate an effective month, or alter a calculated run. The idempotent migration backfills existing workspaces from saved payroll items and current employee values.

### payrollRuns

One company payroll per month with period, state, aggregate totals, employee count, createdAt, and optional calculatedAt, approvedAt, and processedAt. Index: `by_company_period`. Lifecycle: `draft → calculating → ready_for_review → approved → processed`. Calculation is atomic; approval and finalization are separate explicit actions. Processed means a locked PayFlow record, never a bank transfer.

### payrollItems

Immutable employee snapshot for one run: employee identity/role fields plus base, bonus, reimbursement, deduction, gross, and net amounts. Indexes: `by_run`, `by_employee`. One-time generation stores items and totals together. Negative net or unsafe arithmetic aborts the transaction. Later employee or salary changes never rewrite history.

### adjustments

Monthly bonus, reimbursement, or deduction with company/employee, optional run, title/description, amount, effective period, `pending | approved | rejected` state, createdAt, and optional reviewedAt/reviewNote. Indexes: `by_company_period`, `by_employee`. Submission has no payroll impact. Approval revalidates the complete projection in the same transaction; rejection stays excluded. Calculated periods reject entries and approvals, while stale pending entries can still be rejected.

### activityEvents

Durable company, payroll, employee, and adjustment events with entity identifiers, action, message, optional monetary/period metadata, and createdAt. Index: `by_company`. Creation, calculation, approvals, finalization, adjustment decisions, and salary revisions write activity transactionally. The Activity page returns the newest 100. There is no authenticated actor identity in M2.

### scenarios

Saved what-if summary with company, name, period, target type/identifier, subject label, raise basis points, affected count, baseline/projected base and net totals, monthly change, annualized change, and createdAt. Index: `by_company_period`. Values are immutable snapshots and never drive payroll calculation.

### scenarioItems

Affected-person snapshot with scenario/company/employee, display identity, department, baseline/projected base pay, baseline/projected net pay, and changes. Indexes: `by_scenario`, `by_employee`. Saving writes all items transactionally; discard removes them before the scenario header.

## Planned

AI actions, approval requests, and payslips. Effective-dated employment status and termination also remain future work.
