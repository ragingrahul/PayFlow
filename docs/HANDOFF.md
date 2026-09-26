# PayFlow Engineering Handoff

## Current State

Working local Next.js + Convex payroll foundation. Dashboard, people/detail, payroll create/calculate, adjustments, and activity subscribe to real data. 24 employees; September 2026 is ready for review with 24 items and ₹21,68,450.50 net pay. August processed history has 23 people. October is still draft with ₹20,000 Ananya bonus from browser verification (projection ₹21,10,000).

## Current Milestone

Milestone 1 complete and verified. Next feature work is Milestone 2.

## Last Thing Worked On

Real browser creation/calculation/persistence, two-tab realtime money/activity verification, native month-input fix, responsive checks, and durable docs.

## Next Recommended Task

Add a human payroll-review/approval flow in M2. Preview the saved snapshot, explicitly confirm approval, enforce ready_for_review → approved transactionally, record an activity event, and test repeated/invalid approvals. Keep processed as a separate explicit step; no payments.

## Files Most Relevant

- src/lib/payroll.ts
- convex/payrollService.ts
- convex/payroll.ts
- convex/adjustments.ts
- convex/schema.ts
- src/components/payroll-screen.tsx
- src/components/shell.tsx
- tests/payroll.test.ts
- tests/backend.test.ts
- docs/TEST_LOG.md

## Important Decisions

Integer paise; atomic calculation and immutable snapshots; calculated periods locked; direct HR entry is not an AI-approved tool. Seed is internal and idempotent. September remains absent only on a fresh seed; do not delete current runs to repeat the demo.

## Known Problems

New past-period calculation uses current salary/status (no effective dating). Selected period resets to September on full reload. Authentication and approval are intentionally absent. No confirmed blocker remains for M1.

## Verification Status

50 tests, lint, typecheck, production build, and actual-backend read-only smoke passed. Full September success workflow, persistence after reload, realtime bonus update across tabs, and responsive 375/768/1280px checks passed. Final post-format regression passed, including format check and an optimized production-server browser smoke with 24 saved items and no console errors. See TEST_LOG for exact details.

## Environment Notes

Node 22.14.0, npm 10.9.2. `npm install`; terminal 1 `npx convex dev`; terminal 2 `npm run seed` then `npm run dev`. Frontend http://127.0.0.1:3000; backend http://127.0.0.1:3210. CLI writes .env.local and .convex; neither is committed. NEXT_PUBLIC_CONVEX_URL is required; CONVEX_DEPLOYMENT is CLI-managed; site URL is currently unused. No external service keys. Existing local backend and Next dev server were left running during verification.

## Do Not Accidentally Change

No currency-unit mixing or business math in React. Never silently approve payroll or add AI write access. Preserve snapshots and tests. Do not introduce auth, banking, statutory compliance, PDF, or integrations as incidental M1 polish. Do not claim the local demo is production ready. Update all relevant engineering memory before stopping.
