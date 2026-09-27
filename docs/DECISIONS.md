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

Date: 2026-09-27. Status: Superseded by DEC-007 for new entries.

### Context

The foundation must visibly demonstrate that adjustments change realtime payroll without corrupting saved snapshots.

### Decision

Milestone 1 direct HR entry created an approved adjustment after an explicit confirm-and-save action. Reject adjustments for calculated periods. Add pending-entry review in M2.

### Reason

Enables real bonus/reimbursement/deduction demos while preserving one authoritative saved payroll.

### Consequences

Fresh seed leaves September absent for the creation success test and October as the example draft. No silent reset or destructive reseed. Existing direct HR mutations must not be reused as unguarded AI tools.

### Do not change unless

M2 adds validated review/reopen semantics and tests.

## DEC-007 — Explicit review and effective-dated compensation

Date: 2026-09-27. Status: Accepted.

### Context

Payroll operators need to understand which proposed changes affect a run and must preserve historical salary truth.

### Decision

New adjustments start pending. Approval revalidates the complete projected payroll atomically; rejection records the decision without affecting totals. Salary changes are append-only compensation revisions with an effective month and reason. Approval and finalization remain separate adjacent payroll transitions.

### Reason

The UI can explain proposal, review, and locked-record states without silently changing money. Period calculations remain reproducible while payroll snapshots stay immutable.

### Consequences

Calculated periods cannot accept new approvals or salary changes that would alter them. Pending entries in locked periods can still be rejected. `processed` describes PayFlow record finalization only; it never means money moved. Existing data requires the idempotent Milestone 2 backfill.

### Do not change unless

A tested reopen/recalculation design preserves the original snapshot and audit trail.

## DEC-008 — Scenarios are immutable, isolated snapshots

Date: 2026-09-27. Status: Accepted.

### Context

People need to compare raise costs without risking real compensation or payroll.

### Decision

Calculate raises in integer basis points with half-up paise rounding. Use saved payroll items as the baseline for calculated periods and current effective inputs for draft/future periods. Persist scenario summaries and affected-person snapshots. Provide save and discard only; do not expose apply.

### Reason

The result is reproducible, reviewable, and structurally separated from authoritative payroll mutations.

### Consequences

Saved scenarios do not drift when salaries or adjustments later change. Discard removes scenario records only and leaves a durable activity event. Applying a plan requires a future explicit revalidation and confirmation design.

### Do not change unless

The apply workflow preserves preview/version binding, explicit human confirmation, and atomic compensation writes.

## DEC-009 — Copilot providers cannot mutate payroll

Date: 2026-09-27. Status: Accepted.

### Context

Natural-language payroll requests are useful, but model output is probabilistic and external providers must not control authoritative employee or money records.

### Decision

Expose bounded read and proposal-preparation tools through a provider-neutral adapter. Run OpenAI Responses or Inkeep Chat orchestration in a server-only Next.js route. Treat every provider result as untrusted input. Re-resolve the employee, parse paise, calculate impact, and persist the proposal in Convex. Bind it to the exact relevant payroll inputs. Require explicit confirmation, revalidate the version, and create a pending adjustment only. Preserve the existing separate adjustment approval.

### Reason

The model can interpret useful language while deterministic application code and two human checkpoints retain authority over payroll.

### Consequences

Copilot cannot directly approve adjustments, revise salaries, apply scenarios, or operate payroll. A source change invalidates an old proposal. External credentials stay in the route handler. OpenAI and Inkeep share the same tools and backend contract. Missing credentials disable chat without a demo-response fallback.

### Do not change unless

A replacement design keeps provider output untrusted, binds approval to current data, records the full decision trail, and never allows a model to bypass human confirmation.

## DEC-006 — Local-only foundation and honest future screens

Date: 2026-09-27. Status: Accepted.

### Context

Authentication and external integrations are explicitly excluded; the UI still needs complete navigation.

### Decision

Bind Next.js to loopback, use anonymous local Convex, and label unfinished features as planned with no pretend actions. Settings is a read-only workspace view. Default demo period is September 2026.

### Reason

A runnable real foundation without implying unfinished features work.

### Consequences

No public hosting, cloud infrastructure, payments, compliance, or production-data safety claim. Seed contains fictional identities and example-domain emails. Period is validated URL state.

### Do not change unless

Deployment/auth or the corresponding feature milestone is explicitly implemented and verified.
