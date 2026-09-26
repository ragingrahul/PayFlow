# Architecture

## High-level architecture

Next.js App Router UI → typed Convex queries/mutations → Convex database.

Convex is the only payroll store. No localStorage, mock API, browser-side financial database, or fabricated dashboard metrics. Local anonymous Convex is a real persistent backend; the CLI maintains `.convex/` (gitignored). Start it alongside Next.js. No cloud deployment or account was created.

## Frontend structure

- `src/app`: route entries, global tokens/styles, layout, loading/error/not-found boundaries.
- `src/components/shell.tsx`: navigation, company subscription, connection status, shared period selection (default September 2026 demo period).
- `src/components/*-screen.tsx`: dashboard, people/detail, payroll, adjustments, and honest future-feature information screens.
- `src/components/ui.tsx`: badges, avatars, native accessible dialog, error/empty/loading states.
- `src/components/providers.tsx`: Convex client and explicit missing-configuration instructions.
- `src/lib/format.ts`: currency/date display only.

Period selection is shared during client navigation, but resets to the demo period on a full reload. A native month field uses `onInput`, verified in the browser; `onChange` did not reliably commit month input in browser testing. Dialogs use native focus trapping and Escape dismissal. Responsive sidebar has mobile navigation and a scrolling desktop rail. The current design is intentionally light-only; no theme toggle.

## Backend structure

- `convex/schema.ts`: six implemented tables, validators, indexes.
- `convex/workspace.ts`, `employees.ts`, `dashboard.ts`: workspace and realtime read models.
- `convex/payroll.ts`: list/detail queries; create/generate mutations.
- `convex/payrollService.ts`: eligible employee retrieval, approved adjustments, transactions, snapshot persistence, activity.
- `convex/adjustments.ts`: period query and validated direct HR entry.
- `convex/seed.ts`: internal CLI-only, idempotent demo initialization. Does not reset data.
- `convex/_generated`: official Convex-generated types and API bindings; do not hand-edit.
- `src/lib/payroll.ts`: pure financial engine, currency parsing, aggregation, period validation, state machine.

No Convex actions or external services are needed in M1. Queries remain read-only; mutations are atomic. Testing uses Vitest + convex-test for backend transactions and the browser for real local Convex/UI behavior.

## Financial calculation architecture

Store INR as safe integer paise. Gross = base + approved bonuses. Net = gross + approved reimbursements − approved deductions. Reject fractions in stored money, negative inputs, invalid types, zero adjustments, overflow, and negative net. Exact string-to-paise parsing uses BigInt before safe-number conversion. React displays results; it never calculates authoritative payroll.

The dashboard projects from current eligible employee/adjustment data until a run is calculated, then uses the saved snapshot. Department totals are computed server-side. Month-to-month percentage is a display metric, not authoritative monetary arithmetic.

## Payroll state machine

`draft → calculating → ready_for_review → approved → processed`

Only adjacent forward transitions are valid. M1 exposes create draft and calculate only. Generation performs both draft → calculating and calculating → ready_for_review in one mutation: subscribers see either the original draft or the complete results. Any validation/persistence failure rolls back state, items, totals, and activity. Repeating generation is rejected, preventing duplicate items. Approval and processing UI/public mutations remain M2; no money moves.

Calculated snapshots are locked. Add adjustments before calculation or in a future/draft period. Editing and controlled reopening/recalculation need explicit M2 design rather than silently rewriting history.

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

No authentication by explicit milestone scope. This is a development/demo application; do not expose real employee data. Company consistency checks are integrity checks, not user authorization. No effective-dated salaries/statuses means newly generating past payroll uses current compensation; only existing snapshots preserve history. Atomic collection/generation is intentionally sized for the 24-person MVP; pagination/batching is needed before large workspaces.

## Setup references

Implementation followed the official [Convex local development guide](https://docs.convex.dev/cli/local-deployments), [Convex agent-mode setup](https://docs.convex.dev/cli/agent-mode), and [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation). Installed versions are recorded in package-lock.json.
