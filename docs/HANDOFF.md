# PayFlow Engineering Handoff

## Current State

Working local Next.js + Convex payroll operations app. Dashboard, people/detail, payroll, adjustments, and activity subscribe to real data. September 2026 remains ready for review with 24 items and ₹21,68,450.50 net pay. August is processed with 23 people. October is a draft with the existing ₹20,000 Ananya bonus.

## Current Milestone

Milestone 2 complete and verified. Next feature work is Milestone 3 scenario mode.

## Last Thing Worked On

Pending adjustment review, effective-dated compensation and migration, payroll approval/finalization, activity history, URL periods, tests, browser verification, and documentation.

## Next Recommended Task

Implement isolated salary scenarios. A scenario may calculate hypothetical employee and department impact but cannot write compensation or payroll. Applying later must show exact impact, require explicit confirmation, and revalidate current data.

## Files Most Relevant

- `src/lib/payroll.ts`
- `convex/compensationService.ts`
- `convex/payrollService.ts`
- `convex/payroll.ts`
- `convex/adjustments.ts`
- `convex/employees.ts`
- `src/components/payroll-screen.tsx`
- `src/components/people-screen.tsx`
- `tests/backend.test.ts`

## Important Decisions

Integer paise; atomic calculation; immutable snapshots; append-only salary revisions; pending adjustments; explicit adjacent payroll transitions. `processed` never means paid. The Milestone 2 migration is idempotent and leaves snapshots untouched.

## Known Limits

Employment status/termination is not effective-dated. Calculated runs cannot reopen or recalculate. Authentication, bank rails, taxes/compliance, PDFs, email, AI, and external integrations are outside M2.

## Verification Status

53 tests, lint, typecheck, formatting, production build, local migration, and real-browser checks passed. Browser checks covered approval confirmation, pending-adjustment wording/controls, compensation timeline, full activity, and October period persistence across reload/navigation. No M2 browser check mutated payroll data.

## Environment Notes

Node 22.14.0, npm 10.9.2. Run `npm install`; terminal 1 `npx convex dev`; terminal 2 `npm run seed` then `npm run dev`. Frontend is `http://127.0.0.1:3000`; backend is `http://127.0.0.1:3210`. `.env.local` and `.convex` remain ignored. Existing local data has already run `npx convex run migrations:milestone2` twice, with the second pass expected to make zero changes.

## Do Not Accidentally Change

No currency-unit mixing or business math in React. Never silently approve an adjustment/payroll or grant AI direct write access. Preserve snapshots and audit events. Keep scenarios isolated until explicit apply logic exists. Do not claim the local demo is production ready.
