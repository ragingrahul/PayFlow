# Data model

All amounts below are safe integer **paise**; all timestamps are Unix milliseconds. Convex supplies `_id` and `_creationTime`. The schema lives in `convex/schema.ts`. Business invariants are enforced in service/mutation code in addition to Convex validators.

## Implemented

### companies

Purpose: payroll workspace. Fields: name, slug, currency (`INR`), country (`IN`), createdAt. Index: `by_slug`. The idempotent seed owns the `acme-studio` slug. Current UI selects that workspace; multi-company creation/switching is future work.

### employees

Purpose: current employee/contractor profile and agreed monthly compensation. Fields: companyId, employeeCode, firstName, lastName, email, department, jobTitle, employmentType (`full_time`, `part_time`, `contractor`), joiningDate (ISO date), status (`active`, `inactive`), baseMonthlySalary, currency (`INR`), createdAt.
Relationships: belongs to company; referenced by adjustments/items. Indexes: `by_company`, `by_company_code`. Calculation includes active people joined by the last calendar day of the chosen period. Salary must be a non-negative safe integer. Seed codes are unique within company; future write endpoints must enforce this invariant. There is no employee write API yet. Employment status and salary are current values, not effective-dated records.

### payrollRuns

Purpose: one company payroll per month. Fields: companyId, month, year, status, totalBasePay, totalBonuses, totalReimbursements, totalDeductions, totalGrossPay, totalNetPay, employeeCount, createdAt, optional calculatedAt and approvedAt.
Index: `by_company_period` (companyId, year, month). A transactional indexed lookup prevents duplicate periods. Valid month 1–12, year 2000–2100. Public lifecycle in M1: draft → calculating → ready_for_review. Calculating is transactional and not exposed as a long-lived subscription state. Later approved → processed transitions are defined in the state machine, but have no public mutation/UI yet. Historical seed is processed explicitly through valid transitions. Processed never means an actual bank transfer in this MVP.

### payrollItems

Purpose: immutable calculated employee snapshot for one run. Fields: companyId, payrollRunId, employeeId, employeeName, employeeCode, department, jobTitle, basePay, bonusTotal, reimbursementTotal, deductionTotal, grossPay, netPay, status (`calculated`). Indexes: `by_run`, `by_employee`.
Relationships: run, employee, company. One item per eligible employee per run, ensured by one-time atomic generation. Gross = base + bonuses. Net = gross + reimbursements − deductions. Items and run totals commit together. Negative net and unsafe arithmetic abort the transaction. Later current employee edits do not rewrite historical snapshots. No public edit/delete API exists.

### adjustments

Purpose: explicit monthly bonus, reimbursement, or deduction. Fields: companyId, employeeId, optional payrollRunId, type, amount, title, optional description, effectiveMonth, effectiveYear, status (`pending`, `approved`, `rejected`), createdAt. Indexes: `by_company_period`, `by_employee`.
Only approved entries for the period and matching run/unbound run affect calculation. Positive safe integer amount; valid period; employee belongs to company and is active/eligible. Direct HR entry creates an approved adjustment after an explicit confirm-and-save action. All writes validate the resulting payroll projection atomically. Calculated periods are locked. Approval/rejection workflows for pending entries are M2. There is no public AI-originated endpoint; future AI operations need separate approval records.

### activityEvents

Purpose: durable record of meaningful payroll, company, employee, and adjustment operations. Fields: companyId, entityType, optional entityId, action, message, optional metadata (`previousAmount`, `newAmount`, `month`, `year`), createdAt. Index: `by_company`. Recent activity is ordered by insertion (`_creationTime`); display timestamps use createdAt. Payroll creation/calculation and direct HR adjustment entries write events in the same transaction. Historical seed events are labelled demo data. No authenticated actor identity in M1.

## Planned

scenarios, scenarioItems, aiActions, approvalRequests, payslips. None of these tables exist yet. Compensation effective dating and termination dates must precede accurate arbitrary historical recalculation.
