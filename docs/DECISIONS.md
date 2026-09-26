# Decisions

## DEC-001 — Convex as application source of truth

Date: 2026-09-27. Status: Accepted.

### Context

The MVP needs transactional persistence and observable realtime behavior.

### Decision

Use typed Convex queries/mutations with a local development deployment initially.

### Reason

Matches the requested stack and avoids fake/localStorage data paths.

### Consequences

The backend must run alongside Next.js. No auth means local demo scope only.

### Do not change unless

The user explicitly approves a backend migration.

## DEC-002 — Integer paise and deterministic services

Date: 2026-09-27. Status: Accepted.

### Context

Financial correctness and future AI proposals require a single trusted calculation layer.

### Decision

Store all money as safe integer paise. Pure functions validate and sum; reject negative net pay and overflow. INR demo company; no tax or real payments.

### Reason

Exact arithmetic and reusable testable logic.

### Consequences

UI must parse decimal input exactly and format paise consistently. No proration or hourly calculation in M1; contractors have agreed monthly amounts.

### Do not change unless

An explicit currency/rounding policy and migration are designed and tested.

## DEC-003 — Transactional payroll snapshots

Date: 2026-09-27. Status: Accepted.

### Context

Partial payroll calculations and mutable employee names/salaries could corrupt history.

### Decision

Draft creation is separate from atomic generation. Snapshot eligible employee data and approved period adjustments into items and totals; enforce one company run per month.

### Reason

A failed generation leaves no partial totals or items. History remains stable.

### Consequences

Calculating is an internal transactional state; subscribers observe draft then ready_for_review. Recalculation of review runs will be explicit and controlled.

### Do not change unless

Workspace size requires a tested batched calculation job.

## DEC-004 — Future AI requires human confirmation

Date: 2026-09-27. Status: Accepted.

### Context

Natural language is not authoritative financial logic.

### Decision

AI proposes through controlled tools; application code validates/calculates; humans explicitly confirm; mutation revalidates then verifies the result. Scenarios are isolated until applied.

### Reason

Prevents silent financial changes and preserves auditability.

### Consequences

No AI, payments, authentication, or external integrations in M1.

### Do not change unless

The product scope is explicitly revisited; never remove human confirmation silently.

## DEC-005 — Lock calculated periods; minimal direct HR entry

Date: 2026-09-27. Status: Accepted.

### Context

The foundation must visibly demonstrate that adjustments change realtime payroll without corrupting saved snapshots.

### Decision

Include a small direct-HR adjustment form with explicit confirmation and immediate approval. Reject adjustments for calculated periods. Keep pending-entry review and controlled recalculation for M2.

### Reason

Enables real bonus/reimbursement/deduction demos while preserving one authoritative saved payroll.

### Consequences

Fresh seed leaves September absent for the creation success test and October as the example draft. No silent reset or destructive reseed. Existing direct HR mutations must not be reused as unguarded AI tools.

### Do not change unless

M2 adds validated review/reopen semantics and tests.

## DEC-006 — Local-only foundation and honest future screens

Date: 2026-09-27. Status: Accepted.

### Context

Authentication and external integrations are explicitly excluded; the UI still needs complete navigation.

### Decision

Bind Next.js to loopback, use anonymous local Convex, and label Scenarios/Copilot as planned with no pretend actions. Settings is a read-only workspace view. Default demo period is September 2026.

### Reason

A runnable real foundation without implying unfinished features work.

### Consequences

No public hosting, cloud infrastructure, payments, compliance, or production-data safety claim. Seed contains fictional identities and example-domain emails. Period currently resets on full reload.

### Do not change unless

Deployment/auth or the corresponding feature milestone is explicitly implemented and verified.
