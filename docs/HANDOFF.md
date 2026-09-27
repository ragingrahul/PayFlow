# PayFlow Engineering Handoff

## Current State

Working local Next.js + Convex payroll and scenario application. Milestones 1–3 are complete: payroll operations, effective compensation, approvals, activity, and isolated raise scenarios. September remains ready for review at ₹21,68,450.50; October remains a draft at ₹21,10,000.

## Current Milestone

Milestone 3 complete and verified. Next feature work is Milestone 4 AI Payroll Copilot.

## Last Thing Worked On

Employee/department raise preview, deterministic basis-point calculation, immutable scenario snapshots, affected-person details, discard behavior, tests, browser verification, and documentation.

## Next Recommended Task

Design the Copilot tool boundary before connecting a model. Begin with read-only questions and structured proposals. Bind proposals to exact inputs and results; require explicit confirmation and backend revalidation before invoking existing adjustment or compensation mutations.

## Files Most Relevant

- `src/lib/payroll.ts`
- `convex/scenarios.ts`
- `convex/payrollService.ts`
- `convex/schema.ts`
- `src/components/scenarios-screen.tsx`
- `src/components/future-screen.tsx`
- `tests/payroll.test.ts`
- `tests/backend.test.ts`

## Important Decisions

Scenarios are immutable snapshots. Calculated periods use saved payroll items as baseline; draft/future periods use effective inputs. Percentages are integer basis points with half-up paise rounding. No apply mutation exists.

## Known Limits

Scenarios only model positive percentage raises for one employee or department. They cannot apply changes, model fixed-amount changes, decreases, hiring, termination, taxes, or proration. Authentication and external integrations remain absent.

## Verification Status

64 tests, lint, typecheck, formatting, production build, persisted-data smoke, and browser workflow pass. Browser verification created an 8.25% Engineering scenario for October, confirmed ₹73,425 monthly and ₹8,81,100 annualized impact across eight people, then discarded it. Payroll and compensation totals remained unchanged.

## Environment Notes

Run `npm install`; terminal 1 `npx convex dev`; terminal 2 `npm run seed` then `npm run dev`. Frontend is `http://127.0.0.1:3000`; backend is `http://127.0.0.1:3210`. `.env.local` and `.convex` remain ignored.

## Do Not Accidentally Change

Never add an apply button by directly reusing scenario snapshots. Recalculate against current source data and require explicit confirmation first. Keep money in paise and percentage inputs in basis points. Preserve payroll snapshots, scenario snapshots, and audit activity.
