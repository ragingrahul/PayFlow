# PayFlow Engineering Handoff

## Current State

Working Next.js + Convex payroll application through Milestone 5. The local frontend currently uses the user-owned `vivid-akita-75` Convex cloud development deployment. It covers payroll operations, effective compensation, adjustment review, activity, isolated raise scenarios, human-confirmed Copilot proposals, employee onboarding/offboarding, processed payslips, a portal preview, and hackathon presentation material. The repository also contains product-first README content, SVG brand assets, real product screenshots, social metadata, launch copy, media storyboards, and an empty truthful distribution log. Hosted September remains ready for review at ₹21,68,450.50; October remains a draft at ₹20,90,000 after the clean fictional cloud seed.

## Current Milestone

Milestone 5 application scope, launch-kit preparation, and hosted Convex development backend are complete. Live Resend/OpenAI/Inkeep acceptance, public frontend hosting, video rendering, and external publishing remain.

## Last Thing Worked On

Connected the repository to the user-owned `vivid-akita-75` cloud development deployment, deployed the schema/functions/21 indexes, ran the fictional seed twice to prove idempotence, created and calculated September, and verified the hosted backend through the smoke suite and local frontend.

## Next Recommended Task

Deploy the Next.js frontend with the verified cloud Convex URL, configure `NEXT_PUBLIC_APP_URL`, and run a public desktop/mobile smoke check. Then configure one Copilot provider and run its live acceptance flow with synthetic data. Approve the creative direction in `docs/MEDIA_PLAN.md` before creating the first X video. Add production identity/RBAC before using any real employee data.

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
- `docs/MARKETING.md`
- `docs/MEDIA_PLAN.md`
- `docs/DISTRIBUTION_LOG.md`

## Important Decisions

Employee eligibility is period-aware: joined by month end and not departed before month start. The leaving month receives the full agreed monthly amount because the MVP has no daily proration. Any lifecycle edit that would change a calculated run is rejected. Payslip money is never duplicated; it is projected from immutable processed payroll items. Email records contain delivery state only.

## Known Limits

The portal is a no-auth employee preview, not a private account. Contractors use agreed monthly amounts; there are no timesheets. Tax/statutory calculations, bank transfers, server-generated PDF storage, production identity/RBAC, pagination, and production operations remain outside Milestone 5. The hosted backend contains fictional data only. Live provider calls have not run because credentials are absent, and the frontend does not yet have a public host.

## Verification Status

76 tests cover lifecycle creation/editing, uniqueness, calculated-history protection, leaving-month inclusion, later exclusion, reactivation, processed-only payslips, and delivery lifecycle in addition to all earlier payroll/Copilot coverage. Lint, typecheck, formatting, the 17-route Webpack production build, cloud-persisted smoke, local-frontend/browser verification against cloud data, browser captures, and rendered social metadata pass. The default Turbopack build is limited by this execution sandbox's CSS worker port. See `docs/TEST_LOG.md` for the exact results.

## Environment Notes

Run `npm install`, then `npm run dev`. The ignored `.env.local` selects `dev:vivid-akita-75` and `NEXT_PUBLIC_CONVEX_URL=https://vivid-akita-75.eu-west-1.convex.cloud`. Use `npx convex dev --once` to push future backend changes and `npm run smoke` to verify hosted state. The anonymous local database remains in ignored `.convex/` for recovery. Optional email requires `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL`. Optional Copilot requires either OpenAI or Inkeep variables from `.env.example`. Secrets stay server-side. The separate `descriptive-crab-939` production deployment is untouched.

## Do Not Accidentally Change

Do not read payslip amounts from mutable employee/adjustment data or create a second financial record. Keep lifecycle changes blocked when they alter calculated populations. Keep model output untrusted and preserve both Copilot confirmation and normal adjustment approval. Do not remove the portal-preview label until real identity and authorization exist.
