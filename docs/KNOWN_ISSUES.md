# Known Issues

## Active

No confirmed Milestone 5 defects.

## Intentional scope limitations

No production auth/RBAC, multi-company switching, hourly timesheets, day-level proration, taxes/EPF/ESI, bank payments, or direct server PDF generation. Employee portal access is an explicitly labeled preview; browser print provides PDF export. Reopening or recalculating a calculated run is unsupported. Scenarios remain positive-raise snapshots and cannot be applied. Copilot cannot approve its proposals. Live OpenAI, Inkeep, and Resend execution requires server-side credentials; none were present in the verified local environment. Public deployment also requires a hosted Convex deployment. These are explicit hackathon boundaries, not defects.

## Resolved

### ISSUE-005 — Period selection resets on reload

Severity: Low
Status: Resolved 2026-09-27
Area: Navigation

Resolution: Validated `?period=YYYY-MM` URL state now drives every subscribed screen and is preserved by navigation links and full reloads.

### ISSUE-004 — Historical generation uses current compensation

Severity: Medium
Status: Resolved for salary 2026-09-27
Area: Compensation eligibility

Resolution: Added effective-dated compensation revisions, period salary lookup, protected revision writes, and an idempotent existing-data backfill. Saved payroll snapshots remain unchanged. Employment status and termination dates remain a documented scope limitation.

### ISSUE-001 — Month input did not change the data query

Severity: High
Status: Resolved 2026-09-27
Area: Period selection

Description: Browser month input visually changed while React’s onChange handler did not update shared period state.

Resolution: Use the input event with validated year bounds. Verified switching September/October/November and realtime October projection updates.

### ISSUE-002 — Cached Turbopack sandbox failure

Severity: Environment blocker
Status: Resolved 2026-09-27
Area: Build

Description: Sandbox denied the CSS worker’s localhost port. An escalated retry reused the failed cached computation.

Resolution: Moved only generated `.next/cache/turbopack` to a temporary directory; reran the approved build with local port access. Build passed. Source unchanged; no user data removed.

### ISSUE-003 — Sidebar overflow on short viewports

Severity: Low
Status: Resolved 2026-09-27
Area: Responsive navigation

Description: Long sidebar content could extend below the fixed viewport without a scrolling rail.

Resolution: Scrollable sidebar, non-shrinking footer, mobile backdrop and Escape dismissal. Verified desktop/tablet/mobile navigation; no page horizontal overflow at 375px or 768px.
