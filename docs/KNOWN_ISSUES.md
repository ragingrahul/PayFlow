# Known Issues

## Active

### ISSUE-004 — Historical generation uses current compensation

Severity: Medium (known M1 scope limit)
Status: Open; planned M2 design
Area: Compensation eligibility

Description: Employees store current salary/status without effective-dated revisions or termination dates.

Expected behavior: A later production-capable version should reconstruct compensation and eligibility as of the requested payroll period.

Current behavior: Newly calculated periods use current monthly salary and current active status, filtered by joining date. Existing saved payroll snapshots remain stable.

Potential cause: Effective-dated compensation/status model is deliberately not implemented in M1.

Next action: Design salary revisions/effective dates before offering arbitrary historical reruns or prorated payroll.

### ISSUE-005 — Period selection resets on reload

Severity: Low
Status: Open
Area: Navigation

Description: Selected month persists during client navigation, not across full reloads.

Expected behavior: Bookmark/share payroll periods through URL parameters.

Current behavior: Reload returns to September 2026, the documented demo default.

Potential cause: Period state lives in the application shell.

Next action: Move period selection to validated URL state during M2 navigation polish.

## Intentional scope limitations

No auth/access control, multi-company switching, employee editing, full adjustment approval workflow, payroll approval/processing controls, hourly/day proration, taxes/EPF/ESI, bank payments, PDF, OpenAI, Inkeep, or Resend. No dark theme is configured. Local backend and frontend processes must be running. No production-readiness or public deployment claim. These are roadmap boundaries, not completed features.

## Resolved

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
