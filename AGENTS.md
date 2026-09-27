# PayFlow

**Payroll that thinks before you pay.**

AI-native payroll for small, distributed companies. Current scope is a real, locally runnable payroll foundation for the Modern Stack Hackathon.

## Stack

Next.js, strict TypeScript, Tailwind CSS, Convex, OpenAI Responses API, and an alternate Inkeep Chat API adapter. Resend comes later.

## Mandatory reading order

Before significant changes read: AGENTS.md → docs/PRODUCT.md → docs/ARCHITECTURE.md → docs/ENGINEERING_RULES.md → docs/PROGRESS.md → docs/DECISIONS.md → docs/KNOWN_ISSUES.md → docs/HANDOFF.md. Also inspect CHANGELOG, TEST_LOG, source, and git status. Working code wins over stale documentation; investigate and correct discrepancies.

## Core constraints

- Convex is the source of truth. No mock successful operations or fabricated metrics.
- Store money in integer paise; deterministic service code calculates payroll.
- AI must not directly calculate authoritative money or mutate records. AI changes require validated previews and explicit human confirmation.
- Preserve working functionality. Do not add integrations outside the milestone.
- No authentication, payment rails, tax compliance, PDF generation, or email delivery. Copilot proposals must use the controlled confirmation boundary.
- Run verification before claiming completion. Update relevant docs after meaningful changes and rewrite HANDOFF before stopping.
- Track every planned feature, bug fix, or meaningful product/code change in a GitHub Issue before implementation. Reference the issue number in the commit and close it only after verification and documentation are complete.

## Current milestone

See docs/PROGRESS.md: Milestone 4 — AI Payroll Copilot, complete and awaiting provider credentials for live external calls.

## Commands

```bash
npm install
npx convex dev
npm run seed
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run format:check
npm run smoke
```

Keep Convex running. Seed is internal, idempotent, and does not reset data. Smoke requires September payroll already calculated. See README for setup and docs/HANDOFF.md for the current demo database. Never commit .env.local or .convex/.

## Change tracking

- Use a GitHub Issue as the work log for every meaningful change.
- Record the problem, intended behavior, scope, acceptance checks, decisions, and final verification in the issue.
- Reference the issue as `#<number>` in commits and pull requests.
- Tiny typo-only documentation corrections may be grouped into the nearest active documentation issue.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
