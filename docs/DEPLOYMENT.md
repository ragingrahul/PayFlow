# Hosted Deployment Runbook

The local anonymous Convex deployment cannot serve a public frontend. A hosted demo needs a user-owned Convex deployment plus a Next.js hosting project.

## 1. Provision hosted Convex

Create a Convex project, deploy the schema/functions, and run the idempotent seed only if synthetic demo data is appropriate. Record the hosted deployment URL and public client URL supplied by Convex. Do not copy `.convex/` local state.

## 2. Configure the frontend host

Deploy this repository as a Next.js application with Node.js support for server routes. Configure:

- `NEXT_PUBLIC_CONVEX_URL` — hosted Convex client URL.
- `CONVEX_URL` — hosted Convex server URL used by server routes/scripts.
- `NEXT_PUBLIC_APP_URL` — final public origin, without a trailing slash.
- `COPILOT_PROVIDER` and the matching OpenAI or Inkeep variables when live Copilot is required.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` when live payslip email is required.

Keep all provider secrets server-side. Never use a `NEXT_PUBLIC_` prefix for API keys.

## 3. Configure providers

For Resend, verify the sender domain and use an authorized test recipient before the demo. For Copilot, choose one provider and model explicitly. Missing credentials are a supported UI state, but a submission that promises live AI or email should run one acceptance request first.

## 4. Verify the deployed application

Check `/welcome`, `/dashboard`, `/people`, `/payroll`, `/adjustments`, `/activity`, `/scenarios`, `/copilot`, and `/portal`. Verify realtime updates, URL period preservation, one processed payslip, browser print preview, and the exact configuration state for every enabled provider. Re-run the read-only smoke checks against the hosted deployment before recording.

## Security boundary

Milestone 5 does not include production authentication, private employee sessions, role-based authorization, tax compliance, or bank payments. The portal is clearly labeled as a preview. Host only synthetic demonstration data until identity and authorization are implemented.
