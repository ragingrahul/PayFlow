# PayFlow Engineering Handoff

## Current State

Working local Next.js + Convex payroll application. Milestones 1–4 are implemented: payroll operations, effective compensation, adjustment review, activity, isolated raise scenarios, and a persisted AI Copilot proposal flow. September remains ready for review at ₹21,68,450.50; October remains a draft at ₹21,10,000.

## Current Milestone

Milestone 4 application work is complete. Live external-provider execution needs user-supplied credentials. Next product work is Milestone 5 hackathon polish.

## Last Thing Worked On

OpenAI Responses and Inkeep Chat tool loops, deterministic Copilot tools, persisted conversations/proposals, source-version binding, confirmation/rejection, two-stage adjustment approval, configuration states, tests, and documentation.

## Next Recommended Task

Configure either OpenAI or Inkeep and run one live read question plus one proposal/reject/correct/confirm flow. Then begin the employee-facing payslip experience without adding real bank or statutory claims.

## Files Most Relevant

- `src/app/api/copilot/route.ts`
- `src/lib/copilot-provider.ts`
- `src/components/copilot-screen.tsx`
- `convex/copilot.ts`
- `convex/adjustmentService.ts`
- `convex/schema.ts`
- `tests/copilot.test.ts`
- `tests/backend.test.ts`

## Important Decisions

Provider output is untrusted interpretation. Tools parse INR, resolve employees, and calculate impact in application code. Convex recalculates before saving a proposal and again before confirmation. Confirmation creates a pending adjustment; the existing approval workflow decides whether it affects payroll.

## Known Limits

Copilot writes only bonus, reimbursement, and deduction proposals for draft/future periods. It cannot approve adjustments, revise salary, apply scenarios, create employees, calculate/finalize payroll, move money, or perform tax/compliance work. The app has no authentication. Live OpenAI/Inkeep calls have not run because no provider credentials are present.

## Verification Status

73 tests, lint, typecheck, formatting, production build, and persisted-data smoke pass. Tests cover tool parsing, read context, proposal persistence, no-impact-before-confirm, pending creation, later normal approval, duplicate decisions, stale data, rejection feedback, locked periods, and company/period isolation. Browser verification covered the October layout, period URL, active navigation, provider/model display, explicit missing-key instructions, disabled composer, and human-approval copy.

## Environment Notes

Run `npm install`; terminal 1 `npx convex dev`; terminal 2 `npm run seed` then `npm run dev`. Configure `COPILOT_PROVIDER=openai` plus `OPENAI_API_KEY` (and optional `OPENAI_MODEL`), or select Inkeep and set `INKEEP_API_KEY`, `INKEEP_BASE_URL`, and `INKEEP_AGENT_ID`. Secrets stay server-side. `.env.local` and `.convex` remain ignored.

## Do Not Accidentally Change

Never trust model-supplied employee IDs, stored totals, or mutation claims. Keep tool output read-only until `recordTurn` validates it. Keep confirmation bound to `sourceVersion`, reject stale proposals, and preserve the second human approval in Adjustments. Do not expose provider keys with `NEXT_PUBLIC_`.
