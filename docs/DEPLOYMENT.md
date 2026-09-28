# Hosted Deployment Runbook

The Convex backend is now hosted, deployed, seeded with fictional data, and verified. A public demo still needs a Next.js hosting project and a final application URL.

## Verified hosted state — 2026-09-27

- Cloud development deployment: `vivid-akita-75`
- Client URL: `https://vivid-akita-75.eu-west-1.convex.cloud`
- HTTP actions URL: `https://vivid-akita-75.eu-west-1.convex.site` (PayFlow does not use HTTP actions)
- Schema, functions, and 21 indexes deployed successfully.
- Fictional Acme Studio seed created once; the second invocation returned `seeded: false`.
- September payroll was created and calculated to the documented 24-person, 216845050-paise snapshot.
- Hosted smoke and browser checks passed.
- The separate Convex production deployment was deliberately left untouched.

## 1. Provision hosted Convex

Completed for the cloud development deployment. Future function changes can be pushed with `npx convex dev --once` while `.env.local` selects `dev:vivid-akita-75`. Run the idempotent seed only with fictional demo data. Do not copy `.convex/` local state into the cloud.

## 2. Configure the frontend host

Deploy this repository as a Next.js application with Node.js support for server routes. Configure:

- `NEXT_PUBLIC_CONVEX_URL` — `https://vivid-akita-75.eu-west-1.convex.cloud` for the verified development demo.
- `NEXT_PUBLIC_APP_URL` — final public origin, without a trailing slash.
- `COPILOT_PROVIDER` and the matching OpenAI or Inkeep variables when live Copilot is required.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` when live payslip email is required.

Keep all provider secrets server-side. Never use a `NEXT_PUBLIC_` prefix for API keys.

## 3. Configure providers

For Resend, verify the sender domain and use an authorized test recipient before the demo. For Copilot, choose one provider and model explicitly. Missing credentials are a supported UI state, but a submission that promises live AI or email should run one acceptance request first.

## 4. Verify the deployed application

After frontend hosting, check `/welcome`, `/dashboard`, `/people`, `/payroll`, `/adjustments`, `/activity`, `/scenarios`, `/copilot`, and `/portal`. Verify realtime updates, URL period preservation, one processed payslip, browser print preview, and the exact configuration state for every enabled provider. Re-run `npm run smoke` against the hosted deployment before recording. The backend-only smoke and local-frontend browser checks already pass.

## Security boundary

Milestone 5 does not include production authentication, private employee sessions, role-based authorization, tax compliance, or bank payments. The portal is clearly labeled as a preview. Host only synthetic demonstration data until identity and authorization are implemented.
