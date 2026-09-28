# Current Milestone

Milestone 5 — Employee-to-payslip lifecycle and hackathon polish

# Goal

Complete the credible hackathon lifecycle from employee onboarding through immutable payslips, then present it through a polished landing page and repeatable demo/deployment path.

# Current Status

Milestone 5 application work and the first launch-kit pass are implemented. The backend is deployed to the user-owned `vivid-akita-75` Convex cloud development deployment, seeded with fictional Acme Studio data, and verified through the full smoke suite and local frontend. Employee lifecycle, processed payslips, browser print/PDF, optional server-only Resend delivery, the product-first README, brand assets, screenshots, social metadata, launch copy, media plan, and truthful distribution log are in place.

# Completed

- [x] Validated employee creation and profile editing with unique code/email enforcement.
- [x] Effective leaving date and reactivation workflows with calculated-run eligibility protection.
- [x] Full-month contractor compensation explicitly represented as monthly MVP compensation.
- [x] Processed-run-only employee payslip queries with no duplicated financial source of truth.
- [x] Separate employee portal preview, printable A4 payslip, and HR deep links.
- [x] Server-only Resend delivery route with sending/sent/failed audit records and activity.
- [x] Honest missing-email-configuration state; no simulated delivery.
- [x] Public landing page, responsive motion, demo script, and deployment runbook.
- [x] Product-first README, SVG brand assets, real launch screenshots, and 1200×630 social card.
- [x] X/LinkedIn launch copy, sponsor-handle references, publishing gates, media storyboard, and distribution log.
- [x] Hosted Convex development deployment with functions, indexes, fictional seed, calculated September snapshot, smoke, and browser verification.
- [x] 76 tests, lint, typecheck, formatting, production build, persisted-data smoke, and browser UI verification.

# In Progress

- Public frontend hosting and external-provider checks remain.

# Next Actions

1. Deploy the Next.js frontend and set `NEXT_PUBLIC_CONVEX_URL` plus `NEXT_PUBLIC_APP_URL` on the host.
2. Configure OpenAI or Inkeep and run the live Copilot acceptance flow.
3. Approve and produce the first 24-second Scenario Mode clip, then capture the realtime and Copilot clips.
4. Configure Resend and run one delivery to an authorized test recipient if email will appear in the submission.

# Blockers

- Live Resend/OpenAI/Inkeep calls need provider credentials. A public PayFlow URL needs a frontend hosting project; the hosted Convex backend is ready.

# Important Current Context

The employee portal is explicitly a preview because the hackathon app has no production identity layer. Payslip financial data is read directly from immutable processed payroll items. Delivery state is separate operational metadata. Employee leaving dates use a full-month policy: eligible through the leaving month and excluded afterward. `.env.local` now selects the `vivid-akita-75` cloud development deployment; the anonymous `.convex/` local database is still intact. Marketing drafts are prepared but nothing has been published.

# Last Verified

2026-09-28 (Asia/Kolkata): 76 tests across three files, lint, typecheck, format check, Webpack production build with 17 routes, hosted September smoke at 216845050 paise, local-frontend browser verification against `vivid-akita-75`, real product screenshots, and rendered Open Graph/Twitter/favicon metadata. The default Turbopack build remains blocked in this execution sandbox by its CSS worker-port restriction.
