# PayFlow

**Payroll that thinks before you pay.**

A real Next.js + Convex payroll application for the Modern Stack Hackathon, with employee lifecycle management, isolated scenarios, a human-approved AI Copilot, and finalized employee payslips. All money uses integer paise; deterministic services calculate payroll and impact; AI interprets requests but cannot silently write payroll.

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
3. Payroll → Create payroll → Calculate → review every item → approve → finalize the record.
4. Adjustments → submit a pending bonus/reimbursement/deduction → approve or reject it. Only approval changes payroll.
5. Open a person to inspect payroll history and effective-dated salary revisions or schedule a future salary change.
6. Open Activity for the full audit trail. The `?period=YYYY-MM` selection survives navigation and reloads.
7. Open Scenarios, choose one employee or a department, enter a percentage raise, and inspect monthly/annual impact. Save or discard the snapshot; real compensation and payroll do not change.
8. Configure one Copilot provider, open Copilot, ask about the selected period, or request a bonus/reimbursement/deduction. Confirming its structured proposal creates a pending adjustment; approve that separately in Adjustments.
9. Add or edit an employee in People, schedule an employment end, or preview that person’s employee portal.
10. Finalize a payroll to expose immutable employee payslips. Print/save them as PDF, or configure Resend for real email delivery.

The public hackathon landing page is at [http://127.0.0.1:3000/welcome](http://127.0.0.1:3000/welcome). The employee experience preview is at [http://127.0.0.1:3000/portal](http://127.0.0.1:3000/portal).

The current development database keeps September ready for review so approval remains demonstrable. October includes a ₹20,000 bonus for Ananya and remains a draft. To demonstrate creation again, use another empty period rather than deleting saved runs.

## Verify

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
# Requires running Convex and the existing September snapshot:
npm run smoke
```

Production preview after building:

```bash
npm start
```

Convex must remain running. See `docs/DEPLOYMENT.md` before hosting because a public frontend requires a Convex cloud deployment and server-side provider variables.

## Environment

- `NEXT_PUBLIC_CONVEX_URL`: Convex client URL (locally `http://127.0.0.1:3210`). Required by frontend and smoke check.
- `CONVEX_DEPLOYMENT`: CLI-managed deployment selection in `.env.local`.
- `NEXT_PUBLIC_CONVEX_SITE_URL`: CLI-generated HTTP actions URL; no HTTP actions are used.
- `COPILOT_PROVIDER`: `openai` (default) or `inkeep`.
- `OPENAI_API_KEY`: server-only OpenAI key. Required for the OpenAI provider.
- `OPENAI_MODEL`: optional OpenAI model override; defaults to `gpt-5-mini`.
- `INKEEP_API_KEY`, `INKEEP_BASE_URL`, `INKEEP_AGENT_ID`: server-only Inkeep Chat API configuration when the Inkeep provider is selected.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`: optional server-only payslip delivery configuration.
- `NEXT_PUBLIC_APP_URL`: public origin inserted into emailed payslip links; locally `http://127.0.0.1:3000`.

Copy the relevant values from `.env.example` into `.env.local` and restart Next.js. Provider secrets remain in the route handler and are never exposed to the browser. If Copilot is not configured, its page shows the missing variables and disables chat; it never generates a fake response. Existing Milestone 1 workspaces are upgraded with `npx convex run migrations:milestone2`; the migration is idempotent and preserves saved payroll snapshots.

## Engineering memory

Start at [AGENTS.md](AGENTS.md), then follow its mandatory reading order. [docs/PROGRESS.md](docs/PROGRESS.md) shows verified status; [docs/HANDOFF.md](docs/HANDOFF.md) identifies the next engineering task. [docs/TEST_LOG.md](docs/TEST_LOG.md) separates real checks from planned checks.

## Change tracking

All meaningful features, fixes, refactors, schema changes, and documentation changes start with a GitHub Issue. Use the issue to record scope, acceptance checks, decisions, verification, and limitations; reference its number in commits and pull requests.

## Scope

This is an unauthenticated hackathon demo with fictional data. Employee creation/profile editing and effective leaving dates are implemented; compensation remains full-month, including for monthly contractors. Production authentication/RBAC, hourly timesheets, proration, compliance, bank transfers, scenario application, salary changes through Copilot, and payroll execution through Copilot remain outside scope. Calculated payroll and saved scenarios are immutable snapshots. Payslips come only from processed snapshots. Browser printing provides PDF export; Resend delivery runs only when configured.
