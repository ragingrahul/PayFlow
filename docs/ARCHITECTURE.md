# Architecture

## High-level architecture

Next.js App Router UI → typed Convex queries/mutations → Convex database.

Convex is the only payroll store. No localStorage, mock API, browser-side financial database, or fabricated dashboard metrics. Local anonymous Convex is a real persistent backend; the CLI maintains `.convex/` (gitignored). Start it alongside Next.js. No cloud deployment or account was created.

## Frontend structure

- `src/app`: route entries, global tokens/styles, layout, loading/error/not-found boundaries.
- `src/components/shell.tsx`: navigation, company subscription, connection status, and validated `?period=YYYY-MM` state (default September 2026).
- `src/components/*-screen.tsx`: landing, dashboard, people/detail, payroll, adjustments, activity, scenarios, Copilot, employee portal/payslip, and settings screens.
- `src/components/ui.tsx`: badges, avatars, native accessible dialog, error/empty/loading states.
- `src/components/providers.tsx`: Convex client and explicit missing-configuration instructions.
- `src/lib/format.ts`: currency/date display only.
- `src/lib/copilot-provider.ts`: provider-neutral tool schemas and deterministic tool execution.
- `src/app/api/copilot/route.ts`: server-only OpenAI/Inkeep orchestration and credential boundary.
- `src/app/api/payslips/email/route.ts`: server-only Resend delivery and delivery-audit boundary.

Period selection survives navigation, bookmarks, and full reloads. Invalid or out-of-range values fall back to the demo period. A native month field uses `onInput`, verified in the browser. Dialogs use native focus trapping and Escape dismissal. Responsive sidebar has mobile navigation and a scrolling desktop rail. The design is light-only.

## Backend structure

- `convex/schema.ts`: thirteen implemented tables, validators, indexes.
- `convex/workspace.ts`, `employees.ts`, `dashboard.ts`: workspace and realtime read models.
- `convex/payroll.ts`: list/detail queries; create, generate, approve, and finalize mutations.
- `convex/payrollService.ts`: eligibility, period compensation, approved adjustments, transactions, snapshots, activity.
- `convex/compensationService.ts`: effective-period ordering and salary resolution.
- `convex/adjustments.ts`: pending submission, approval, and rejection.
- `convex/activity.ts`: full workspace activity query.
- `convex/migrations.ts`: idempotent compensation-history backfill.
- `convex/scenarios.ts`: isolated preview, saved snapshots, detail, and discard.
- `convex/copilot.ts`: conversations, read context, proposal validation, confirmation, rejection, and activity.
- `convex/payslips.ts`: processed-run payslip projections and delivery audit lifecycle.
- `convex/adjustmentService.ts`: shared pending-adjustment validation for direct HR entry and confirmed Copilot proposals.
- `convex/seed.ts`: internal CLI-only, idempotent demo initialization. Does not reset data.
- `convex/_generated`: official Convex-generated types and API bindings; do not hand-edit.
- `src/lib/payroll.ts`: pure financial engine, currency parsing, aggregation, period validation, state machine.

External model calls run in a Next.js Node route so provider secrets never reach the browser. Convex queries remain read-only and mutations remain atomic. Testing uses Vitest + convex-test and the real local browser/backend.

Email delivery follows the same boundary. The server route asks Convex for a processed-payroll projection, creates a `sending` delivery record, calls Resend with an idempotency key, and records `sent` or `failed`. Missing credentials disable the action in the UI; no delivery is simulated.

## Financial calculation architecture

Store INR as safe integer paise. Gross = base + approved bonuses. Net = gross + approved reimbursements − approved deductions. Reject fractions in stored money, negative inputs, invalid types, zero adjustments, overflow, and negative net. Exact string-to-paise parsing uses BigInt before safe-number conversion. React displays results; it never calculates authoritative payroll.

The dashboard projects from current eligible employee/adjustment data until a run is calculated, then uses the saved snapshot. Department totals are computed server-side. Month-to-month percentage is a display metric, not authoritative monetary arithmetic.

## Payroll state machine

`draft → calculating → ready_for_review → approved → processed`

Only adjacent forward transitions are valid. Generation performs draft → calculating → ready_for_review atomically. Explicit confirmation invokes ready_for_review → approved and approved → processed separately. Any failure rolls back state, items, totals, and activity. Repeated or skipped transitions are rejected. No money moves.

Calculated snapshots are locked. Add and approve adjustments before calculation or in a future/draft period. Pending entries in a locked month can still be rejected because rejection cannot alter the snapshot. Controlled reopening/recalculation remains future work.

## Compensation architecture

`compensationRevisions` is an append-only salary timeline. Each record carries a monthly salary, effective month, reason, and audit timestamp. Calculation chooses the newest revision at or before the requested period, then saves that amount in the payroll item. A revision is rejected when its effective month would alter any calculated run. The legacy employee salary field remains for compatibility/fallback; UI and calculation read the revision timeline.

## Employee lifecycle and payslips

Creating a person writes the profile and first compensation revision in one transaction. Employee code and email are unique within the company. Profile edits and employment-date changes compare period eligibility against every calculated run before writing, so they cannot rewrite the population behind a saved snapshot. The MVP uses a full-month leaving-date policy: a person remains eligible through the leaving month and is excluded afterward. Contractor compensation is an agreed monthly amount; there is no hourly or timesheet calculation.

Payslips exist only for `processed` payroll items and read their financial values directly from the immutable snapshot. `payslipDeliveries` stores operational delivery metadata, never another copy of pay. The employee portal is an explicit no-auth preview. Browser print styles provide an A4 save-to-PDF path; server-generated PDFs remain future work.

## Realtime architecture

Dashboard, people, employee details, payroll, adjustments, and activity subscribe using Convex `useQuery`. Real connection status uses `useConvexConnectionState`. A mutation triggers dependency-aware updates in all subscribing tabs. Verified: October bonus increased a separate dashboard by ₹20,000 and added activity without refresh; September creation/calculation updated dashboard state live.

## Demo boundaries

24 employees, five departments, two monthly contractors, one part-time recent joiner. Agreed full monthly salaries; no day/hour proration. Processed August history uses 23 people; Priya’s raise occurs after that snapshot. September starts absent on a fresh seed so the creation workflow is demonstrable. October starts as a draft. The current verified database now has September ready for review and an October performance bonus from browser verification.

## Copilot/tool boundary

User → OpenAI Responses or Inkeep Chat API → controlled PayFlow tools → deterministic interpretation result → Convex validation + persisted proposal → explicit human confirmation → source-version revalidation → pending adjustment → normal adjustment approval → payroll projection.

The model can choose read tools, interpret a target and INR string, propose, and explain. It receives no arbitrary Convex access. Application tools resolve employees, parse money into paise, and calculate impact. The provider never invokes a mutation. `recordTurn` recalculates before persisting; `confirmProposal` compares the entire relevant payroll input snapshot and creates one pending adjustment only. A separate existing approval mutation remains necessary before payroll changes.

OpenAI uses the official JavaScript SDK, Responses function calls, replayed typed output items, and `store: false`. Inkeep uses its OpenAI-compatible Chat endpoint over HTTP because the current Inkeep SDK requires Node 22.18+ while this project remains on Node 22.14. Both adapters expose the same four tools and five-turn ceiling. Provider errors are visible; absent credentials disable the composer.

## Scenario architecture

Scenarios calculate from isolated hypothetical inputs. A calculated period uses immutable payroll items as its baseline; a draft or future period uses effective compensation and approved adjustments. Raises use integer basis points and half-up paise rounding. `scenarios` stores summary snapshots and `scenarioItems` stores affected-person snapshots, so a saved result remains stable if source data later changes. Discard deletes only those snapshots and records activity. No apply mutation exists.

## Important boundaries and risks

No production authentication by explicit milestone scope. This is a development/demo application; do not expose real employee data or provider keys. Company consistency checks are integrity checks, not user authorization. The employee portal is a preview selected from a directory, not a private employee session. Salaries and leaving dates have period semantics, but current status remains an administrative convenience. Atomic collection/generation is intentionally sized for the 24-person MVP; pagination/batching is needed before large workspaces.

## Setup references

Implementation followed the official [Convex local development guide](https://docs.convex.dev/cli/local-deployments), [Convex agent-mode setup](https://docs.convex.dev/cli/agent-mode), and [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation). Installed versions are recorded in package-lock.json.

Milestone 4 follows the official [OpenAI function-calling guide](https://developers.openai.com/api/docs/guides/function-calling), [Responses migration guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Inkeep Chat API](https://docs.inkeep.com/talk-to-your-agents/chat-api), and [Inkeep tool-approval guidance](https://docs.inkeep.com/typescript-sdk/tools/tool-approvals).
