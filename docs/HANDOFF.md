# PayFlow Engineering Handoff

## Current State

Working local Next.js + Convex payroll application through Milestone 5. It covers payroll operations, effective compensation, adjustment review, activity, isolated raise scenarios, human-confirmed Copilot proposals, employee onboarding/offboarding, processed payslips, a portal preview, and hackathon presentation material. September remains ready for review at ₹21,68,450.50; October remains a draft at ₹21,10,000.

## Current Milestone

Milestone 5 application scope is complete. Live Resend/OpenAI/Inkeep acceptance and a hosted deployment require user-owned credentials and infrastructure.

## Last Thing Worked On

Validated employee create/edit/end/reactivate workflows, period-aware eligibility, immutable processed-run payslips, delivery audit records, server-only Resend integration, printable A4 output, employee portal preview, public landing page, and demo/deployment runbooks.

## Next Recommended Task

Configure Resend and one Copilot provider, run their live acceptance flows with synthetic data, then deploy to a user-owned Convex and Next.js host. Add production identity/RBAC before using any real employee data.

## Files Most Relevant

- `convex/employees.ts`
- `convex/payrollService.ts`
- `convex/payslips.ts`
- `convex/schema.ts`
- `src/components/people-screen.tsx`
- `src/components/portal-screen.tsx`
- `src/app/api/payslips/email/route.ts`
- `src/components/landing-screen.tsx`
- `tests/backend.test.ts`
- `docs/DEMO_SCRIPT.md`
- `docs/DEPLOYMENT.md`

## Important Decisions

Employee eligibility is period-aware: joined by month end and not departed before month start. The leaving month receives the full agreed monthly amount because the MVP has no daily proration. Any lifecycle edit that would change a calculated run is rejected. Payslip money is never duplicated; it is projected from immutable processed payroll items. Email records contain delivery state only.

## Known Limits

The portal is a no-auth employee preview, not a private account. Contractors use agreed monthly amounts; there are no timesheets. Tax/statutory calculations, bank transfers, server-generated PDF storage, production identity/RBAC, pagination, and hosted operations remain outside Milestone 5. Live provider calls have not run because credentials are absent.

## Verification Status

76 tests cover lifecycle creation/editing, uniqueness, calculated-history protection, leaving-month inclusion, later exclusion, reactivation, processed-only payslips, and delivery lifecycle in addition to all earlier payroll/Copilot coverage. Lint, typecheck, formatting, Webpack production build, persisted-data smoke, and browser checks pass. The default Turbopack build is limited by this execution sandbox's CSS worker port. See `docs/TEST_LOG.md` for the exact results.

## Environment Notes

Run `npm install`; terminal 1 `npx convex dev`; terminal 2 `npm run seed` then `npm run dev`. Optional email requires `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL`. Optional Copilot requires either OpenAI or Inkeep variables from `.env.example`. Secrets stay server-side. `.env.local` and `.convex` remain ignored.

## Do Not Accidentally Change

Do not read payslip amounts from mutable employee/adjustment data or create a second financial record. Keep lifecycle changes blocked when they alter calculated populations. Keep model output untrusted and preserve both Copilot confirmation and normal adjustment approval. Do not remove the portal-preview label until real identity and authorization exist.
