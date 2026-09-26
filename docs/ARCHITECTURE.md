# Architecture

## High-level architecture

Next.js App Router UI → typed Convex queries/mutations → Convex database.

Convex is the only payroll store. No localStorage, mock API, browser-side financial database, or fabricated dashboard metrics. Local anonymous Convex is a real persistent backend; the CLI maintains `.convex/` (gitignored). Start it alongside Next.js. No cloud deployment or account was created.

## Frontend structure

- `src/app`: route entries, global tokens/styles, layout, loading/error/not-found boundaries.
- `src/components/shell.tsx`: navigation, company subscription, connection status, and validated `?period=YYYY-MM` state (default September 2026).
- `src/components/*-screen.tsx`: dashboard, people/detail, payroll, adjustments, and honest future-feature information screens.
- `src/components/ui.tsx`: badges, avatars, native accessible dialog, error/empty/loading states.
- `src/components/providers.tsx`: Convex client and explicit missing-configuration instructions.
- `src/lib/format.ts`: currency/date display only.

Period selection survives navigation, bookmarks, and full reloads. Invalid or out-of-range values fall back to the demo period. A native month field uses `onInput`, verified in the browser. Dialogs use native focus trapping and Escape dismissal. Responsive sidebar has mobile navigation and a scrolling desktop rail. The design is light-only.

## Backend structure

- `convex/schema.ts`: seven implemented tables, validators, indexes.
- `convex/workspace.ts`, `employees.ts`, `dashboard.ts`: workspace and realtime read models.
- `convex/payroll.ts`: list/detail queries; create, generate, approve, and finalize mutations.
- `convex/payrollService.ts`: eligibility, period compensation, approved adjustments, transactions, snapshots, activity.
- `convex/compensationService.ts`: effective-period ordering and salary resolution.
- `convex/adjustments.ts`: pending submission, approval, and rejection.
- `convex/activity.ts`: full workspace activity query.
- `convex/migrations.ts`: idempotent compensation-history backfill.
- `convex/seed.ts`: internal CLI-only, idempotent demo initialization. Does not reset data.
- `convex/_generated`: official Convex-generated types and API bindings; do not hand-edit.
- `src/lib/payroll.ts`: pure financial engine, currency parsing, aggregation, period validation, state machine.

No Convex actions or external services are needed in M2. Queries remain read-only; mutations are atomic. Testing uses Vitest + convex-test and the real local browser/backend.

## Financial calculation architecture

Store INR as safe integer paise. Gross = base + approved bonuses. Net = gross + approved reimbursements − approved deductions. Reject fractions in stored money, negative inputs, invalid types, zero adjustments, overflow, and negative net. Exact string-to-paise parsing uses BigInt before safe-number conversion. React displays results; it never calculates authoritative payroll.

The dashboard projects from current eligible employee/adjustment data until a run is calculated, then uses the saved snapshot. Department totals are computed server-side. Month-to-month percentage is a display metric, not authoritative monetary arithmetic.

## Payroll state machine

`draft → calculating → ready_for_review → approved → processed`

Only adjacent forward transitions are valid. Generation performs draft → calculating → ready_for_review atomically. Explicit confirmation invokes ready_for_review → approved and approved → processed separately. Any failure rolls back state, items, totals, and activity. Repeated or skipped transitions are rejected. No money moves.

Calculated snapshots are locked. Add and approve adjustments before calculation or in a future/draft period. Pending entries in a locked month can still be rejected because rejection cannot alter the snapshot. Controlled reopening/recalculation remains future work.

## Compensation architecture

`compensationRevisions` is an append-only salary timeline. Each record carries a monthly salary, effective month, reason, and audit timestamp. Calculation chooses the newest revision at or before the requested period, then saves that amount in the payroll item. A revision is rejected when its effective month would alter any calculated run. The legacy employee salary field remains for compatibility/fallback; UI and calculation read the revision timeline.

## Realtime architecture

Dashboard, people, employee details, payroll, adjustments, and activity subscribe using Convex `useQuery`. Real connection status uses `useConvexConnectionState`. A mutation triggers dependency-aware updates in all subscribing tabs. Verified: October bonus increased a separate dashboard by ₹20,000 and added activity without refresh; September creation/calculation updated dashboard state live.

## Demo boundaries

24 employees, five departments, two monthly contractors, one part-time recent joiner. Agreed full monthly salaries; no day/hour proration. Processed August history uses 23 people; Priya’s raise occurs after that snapshot. September starts absent on a fresh seed so the creation workflow is demonstrable. October starts as a draft. The current verified database now has September ready for review and an October performance bonus from browser verification.

## Future AI/tool boundary

User → Copilot → Inkeep orchestration → controlled PayFlow tools → validation + deterministic impact → explicit human confirmation → Convex mutation → retrieve/verify state → record activity.

AI can interpret, query, propose, and explain. No arbitrary record writes, authoritative number generation, silent modifications, or approval bypass. Future mutation tools must require approval records bound to the exact proposal and current data version. Existing direct HR endpoints are not AI-approved tools.

## Scenario architecture

Future scenarios calculate from isolated hypothetical inputs. They cannot write actual compensation or payroll merely by being created/saved. Applying a scenario requires validated impact, explicit confirmation, and revalidation against current data. No scenario tables or executable UI exist yet.

## Important boundaries and risks

No authentication by explicit milestone scope. This is a development/demo application; do not expose real employee data. Company consistency checks are integrity checks, not user authorization. Salaries are effective-dated; employment status and termination are still current-state fields. Atomic collection/generation is intentionally sized for the 24-person MVP; pagination/batching is needed before large workspaces.

## Setup references

Implementation followed the official [Convex local development guide](https://docs.convex.dev/cli/local-deployments), [Convex agent-mode setup](https://docs.convex.dev/cli/agent-mode), and [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation). Installed versions are recorded in package-lock.json.
