# Test Log

## 2026-09-27 — Milestone 4

### Automated checks

- `npm test -- --run` — **73 tests passed across 3 files**.
- `npm run lint`, `npm run typecheck`, and `npm run format:check` — passed.
- `npx next build --webpack` — passed with 11 routes, including dynamic `/api/copilot`. A final Turbopack rerun was blocked by this execution sandbox's worker-port restriction; the standard Turbopack build had passed earlier in the milestone.
- `npm run smoke` — persisted September payroll still has 24 items and 216845050 paise.
- Tool checks cover payroll context, employee search, adjustment filters, exact INR parsing, structured proposals, ambiguous targets, malformed amounts, unsafe deductions, and locked periods.
- Backend checks cover persistence, zero impact before confirmation, pending adjustment creation, later normal approval, duplicate decisions, stale source data, rejection feedback, company isolation, and period isolation.

### Real browser checks

- October Copilot route loaded with the URL period preserved and active navigation.
- Desktop workspace displayed conversation rail, prompt examples, provider/model identity, and “Human approval on” status.
- With no provider key, the page named the exact missing environment variable, disabled the composer, and stated that no AI response is simulated.
- Sidebar no longer marks Copilot as planned.
- No browser workflow wrote financial or Copilot records.

### External-provider status

- No OpenAI or Inkeep credentials were available, so a live model request was not run.
- Provider tool loops compile in the production route; deterministic tool execution and all Convex persistence/approval behavior are covered locally.

### Result

PASS for Milestone 4 application scope. Live provider connectivity remains a credential-dependent acceptance check documented in PROGRESS and HANDOFF.

## 2026-09-27 — Milestone 3

### Automated checks

- `npm test -- --run` — **64 tests passed across 2 files**.
- `npm run lint`, `npm run typecheck`, and `npm run format:check` — passed.
- `npm run build` — passed with all 10 routes.
- `npm run smoke` — persisted September payroll still has 24 items and 216845050 paise.
- Percentage checks cover parsing, bounds, precision, and half-up paise rounding.
- Backend checks cover employee/department preview, eligible targets, approved adjustments, stable saved snapshots, discard, validation, company boundaries, activity, and source-data isolation.

### Real browser checks

- October Scenario page loaded with the URL period preserved and no planned-feature marker.
- Default 8% employee preview updated live from ₹21,10,000 to ₹21,18,400.
- Engineering 8.25% preview affected eight people: ₹73,425 monthly and ₹8,81,100 annualized impact.
- Saved snapshot displayed every affected employee with current/projected base and monthly impact.
- Discard confirmation explicitly stated salaries/payroll remain unchanged; scenario list returned to empty after discard.
- Read-only smoke after browser mutations confirmed payroll stayed unchanged.

### Result

PASS for Milestone 3 scope. Scenarios preview, save, and discard safely; applying a scenario is intentionally unavailable.

## 2026-09-27 — Milestone 2

### Automated checks

- `npm test -- --run` — **53 tests passed across 2 files**.
- `npm run lint` — passed without warnings.
- `npm run typecheck` — passed.
- `npm run format` / `npm run format:check` — passed.
- `npm run build` — passed; 10 routes including `/activity`. The first sandboxed CSS worker attempt could not bind a port; moved only the generated failed Turbopack cache aside and reran with approved local worker access.
- Adjustment tests verify pending exclusion, approval impact, rejection exclusion, invalid projection rollback, repeated decision rejection, and locked periods.
- Compensation tests verify effective-period projection, calculated item salary, duplicate/locked safeguards, migration idempotence, and historical snapshots.
- Payroll tests verify skipped/repeated transition rejection, approval, finalization, timestamps, and activity events.

### Existing-data migration

- First `migrations:milestone2` pass inserted 25 revision records for 24 people (Priya has two historical salaries).
- Follow-up migration logic aligned 23 earliest backfilled salaries to employee joining months; Anika already began in September.
- Final idempotence pass returned zero inserts and zero updates.
- Saved August/September payroll items and totals were not edited.

### Real browser checks

- September payroll displays four clear stages and an approval confirmation with 24 people and ₹21,68,450.50.
- Confirmation explicitly says approval precedes finalization; finalization copy says no bank transfer occurs.
- October adjustment dialog explains that submission is pending and has no impact until approval.
- September’s existing pending adjustment exposes review controls; approval is locked after calculation while rejection remains allowed.
- Priya’s October detail displays current ₹1,15,000 plus August ₹1,10,000 and September ₹1,15,000 compensation revisions.
- Activity shows 10 existing events in newest-first order.
- `period=2026-10` survived direct load, full reload, and generated navigation links.
- No financial record was changed during browser verification.

### Result

PASS for Milestone 2 scope. Approval/finalization, adjustments, compensation history, migration, activity, and URL state are implemented. Remaining exclusions are recorded in KNOWN_ISSUES.

## 2026-09-27 — Milestone 1

### Commands

- `git status --short --branch` — empty unborn master initially; no pre-existing user files.
- `npm install` — dependencies installed; npm audit reported zero vulnerabilities at installation.
- `npx convex dev` — downloaded/started a real anonymous local backend; schema/indexes deployed, generated bindings, TypeScript passed.
- `npm run seed` — created demo company, 24 people, adjustments, August history, October draft.
- `npm test` — **50 tests passed across 2 files** (financial engine and Convex transaction tests).
- `npm run typecheck` — passed.
- `npm run lint` — passed without warnings after config cleanup.
- `npm run build` — passed with all 9 routes, after resolving environment/cache failure below.
- `npm run dev` — local server started on 127.0.0.1:3000.
- `npm run smoke` — passed against actual local Convex; 24 items, exact run totals, dashboard, activity, and employee history verified. September total 216845050 paise.
- `npm run format` then `npm run format:check` — passed; source/docs consistently formatted.
- Final post-format `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run smoke` — all passed.
- `npm start -- --port 3001` — optimized server started; browser dashboard and payroll both displayed ₹21,68,450.50 with 24 payroll items, no console warnings/errors.
- `git check-ignore .env.local .convex node_modules` — all correctly excluded from git.

### Automated financial/backend checks

- [x] Base salary; bonuses; reimbursements; deductions; mixed/multiple and zero adjustments.
- [x] Exact decimal-to-paise input; invalid input, overflow, unsafe/fractional/negative amounts, zero adjustment, unknown type, negative net.
- [x] Aggregate payroll values and overflow.
- [x] Period bounds and all allowed/disallowed state-machine pairs.
- [x] Idempotent demo seed, August 23-person history, September 24-person calculation.
- [x] Pending adjustment exclusion and saved snapshots after salary change.
- [x] Duplicate and concurrent period creation, repeated generation rejection.
- [x] Cross-company integrity, missing company/employee, malformed IDs, inactive/future employees.
- [x] Full rollback on invalid generation and invalid adjustment projections.
- [x] Locked calculated-period adjustments, no-eligible-employee failure.

### Functional checks — actual local backend and browser

- [x] Dashboard loads Acme Studio and 24-person metrics from Convex.
- [x] Initial September projection: base ₹20,90,000 + bonuses ₹70,000 + reimbursements ₹12,950.50 − deductions ₹4,500 = **₹21,68,450.50**.
- [x] People load; search Ananya returns one person; detail shows salary, August payroll, September bonus.
- [x] Invalid employee ID produces a useful employee-not-found state.
- [x] Create September payroll via dialog → draft → calculate → ready for review.
- [x] 24 employee rows and ₹21,68,450.50 total persist after page reload.
- [x] Separate dashboard tab updates draft/ready state and activity without refresh.
- [x] October adjustment added through the real UI: ₹20,000 performance bonus to Ananya. Separate dashboard changed from ₹20,90,000 to ₹21,10,000 and showed the event without refresh.
- [x] Switching periods changes subscribed data (including September/October/November).
- [x] September adjustments locked after calculation; October accepts entry.
- [x] Empty employee search and empty October adjustment state before entry.
- [x] Mobile navigation and native modal Escape dismissal.
- [x] Dashboard visually checked at 1280, 768, and 375px; no page horizontal overflow at tablet/mobile.
- [x] Mobile payroll retains scrollable financial table and readable totals.
- [x] Scenarios/Copilot honestly marked planned; Settings shows read-only company info.
- [x] Browser console contained no errors/warnings during final navigation checks.

### Failures Found

1. Sandbox blocked npm DNS/cache and local Convex connection access.
2. Native month input displayed a changed value but did not change React period state.
3. Production build’s CSS worker could not bind a port inside sandbox; failure persisted in Turbopack cache on first approved retry.
4. Long sidebar could extend below short viewports; parent package-lock triggered a root warning; initial PostCSS config triggered one lint warning.

### Fixes Applied

1. Retried required installs/backend/seed/dev/smoke with scoped approvals.
2. Switched month field to onInput; verified query changes and actual realtime use.
3. Moved generated failing cache aside and reran approved build successfully.
4. Added rail scrolling and Escape close; scoped Turbopack root; named PostCSS config export; Vitest config uses .mts.

### Result

PASS for the Milestone 1 financial/backend tests and end-to-end success workflow. Scope exclusions remain explicit in KNOWN_ISSUES/ROADMAP. No live production deployment, real payment, external integration, or full accessibility audit was attempted.
