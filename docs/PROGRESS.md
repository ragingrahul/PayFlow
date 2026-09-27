# Current Milestone

Milestone 5 — Employee-to-payslip lifecycle and hackathon polish

# Goal

Complete the credible hackathon lifecycle from employee onboarding through immutable payslips, then present it through a polished landing page and repeatable demo/deployment path.

# Current Status

Milestone 5 application work is implemented locally. People can be created, edited, effectively offboarded, and reactivated without changing calculated snapshots. Employee portal payslips derive only from processed payroll items. Browser print/PDF and a server-only Resend delivery route are available; missing credentials disable delivery honestly. The landing page and demo/deployment runbooks are in place.

# Completed

- [x] Validated employee creation and profile editing with unique code/email enforcement.
- [x] Effective leaving date and reactivation workflows with calculated-run eligibility protection.
- [x] Full-month contractor compensation explicitly represented as monthly MVP compensation.
- [x] Processed-run-only employee payslip queries with no duplicated financial source of truth.
- [x] Separate employee portal preview, printable A4 payslip, and HR deep links.
- [x] Server-only Resend delivery route with sending/sent/failed audit records and activity.
- [x] Honest missing-email-configuration state; no simulated delivery.
- [x] Public landing page, responsive motion, demo script, and deployment runbook.
- [x] 76 tests, lint, typecheck, formatting, production build, persisted-data smoke, and browser UI verification.

# In Progress

- Final external-provider and hosted-deployment checks require user-owned credentials.

# Next Actions

1. Configure Resend and run one delivery to an authorized test recipient.
2. Configure OpenAI or Inkeep and run the live Copilot acceptance flow.
3. Provision Convex cloud and a hosting project, then capture final submission assets.

# Blockers

- Live Resend/OpenAI/Inkeep calls and public deployment cannot be exercised without provider credentials and a user-owned hosted Convex deployment.

# Important Current Context

The employee portal is explicitly a preview because the hackathon app has no production identity layer. Payslip financial data is read directly from immutable processed payroll items. Delivery state is separate operational metadata. Employee leaving dates use a full-month policy: eligible through the leaving month and excluded afterward.

# Last Verified

2026-09-27 (Asia/Kolkata): 76 tests across three files, lint, typecheck, format check, Webpack production build with 16 routes, persisted September smoke at 216845050 paise, and desktop-browser verification of the landing page, employee lifecycle form, portal directory, processed payslip, print action, and missing-email-configuration state. The default Turbopack build remains blocked in this execution sandbox by its CSS worker-port restriction.
