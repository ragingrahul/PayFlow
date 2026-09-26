# PayFlow

**Payroll that thinks before you pay.**

A real Next.js + Convex payroll foundation for the Modern Stack Hackathon. All money uses integer paise; deterministic services calculate payroll. AI integrations arrive later.

## Run locally

Node.js 22+ is recommended. Install dependencies:

```bash
npm install
```

Terminal 1 — configure/start Convex. With no configured account/deployment, the non-interactive CLI supports anonymous local development; interactive CLI may offer a local setup choice.

```bash
npx convex dev
```

The CLI writes `.env.local`, generates API bindings, and persists local data in `.convex/`. The first run needs internet access to download the backend. Keep this process running.

Terminal 2 — seed once and start Next.js:

```bash
npm run seed
npm run dev
```

Open [PayFlow](http://127.0.0.1:3000). Seed is idempotent and never resets existing data. Do not commit `.env.local` or `.convex/`.

## Demo workflow

1. Dashboard defaults to September 2026, with 24 people and projected payroll of ₹21,68,450.50 on a fresh seed.
2. People → search Ananya → open her salary, adjustments, and August payroll history.
3. Payroll → Create payroll → Create draft → Calculate payroll.
4. Inspect the 24 persisted items and ready-for-review total. Another open dashboard tab updates automatically.
5. Switch both a dashboard tab and an Adjustments tab to October. Add a bonus and confirm; the other tab’s projection and activity update without refreshing.

The current development database already completed this workflow: September is ready for review; October includes a ₹20,000 bonus for Ananya and remains a draft. To demonstrate creation again, use another empty period rather than deleting saved runs.

## Verify

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
# Requires running Convex and September calculated through the UI:
npm run smoke
```

Production preview after building:

```bash
npm start
```

Convex must remain running. Hosted deployment is outside M1.

## Environment

- `NEXT_PUBLIC_CONVEX_URL`: Convex client URL (locally `http://127.0.0.1:3210`). Required by frontend and smoke check.
- `CONVEX_DEPLOYMENT`: CLI-managed deployment selection in `.env.local`.
- `NEXT_PUBLIC_CONVEX_SITE_URL`: CLI-generated HTTP actions URL; no HTTP actions in M1.

No OpenAI, Inkeep, Resend, banking, or authentication keys are required. A missing client URL shows setup instructions, never fake data.

## Engineering memory

Start at [AGENTS.md](AGENTS.md), then follow its mandatory reading order. [docs/PROGRESS.md](docs/PROGRESS.md) shows verified status; [docs/HANDOFF.md](docs/HANDOFF.md) identifies the next engineering task. [docs/TEST_LOG.md](docs/TEST_LOG.md) separates real checks from planned checks.

## Change tracking

All meaningful features, fixes, refactors, schema changes, and documentation changes start with a GitHub Issue. Use the issue to record scope, acceptance checks, decisions, verification, and limitations; reference its number in commits and pull requests.

## Scope

This is an unauthenticated local demo with fictional data. Approval/finalization, employee editing, effective-dated salaries, authentication, proration, compliance, bank transfers, scenarios, AI integrations, PDFs, and email are intentionally outside the foundation. Calculated payroll is immutable; adjustment entry is allowed only before calculation.
