# Changelog

## Milestone 3 — 2026-09-27

### Added

- Employee and department raise simulations with live monthly and annual impact.
- Integer basis-point percentage parsing and deterministic half-up paise rounding.
- Persisted scenario and affected-person snapshots with a full detail view.
- Scenario discard confirmation and saved/discarded activity events.
- Eleven additional calculation/backend checks; 64 tests now pass.

### Changed

- Scenarios navigation now opens the working scenario workspace.
- Calculated periods use immutable payroll items as the baseline; draft/future periods use effective compensation and approved adjustments.

### Safety

- Preview, save, and discard have no path to compensation or payroll mutations.
- Applying scenarios remains outside Milestone 3.

## Milestone 2 — 2026-09-27

### Added

- Pending adjustment submission with explicit approval/rejection, notes, validation, and activity.
- Effective-dated compensation revisions, employee salary timeline, protected salary editing, and idempotent existing-data migration.
- Payroll approval and finalization confirmations with adjacent transition guards and audit events.
- Full Activity page and validated URL-backed payroll period navigation.
- Three additional backend workflow tests; 53 tests now pass.

### Changed

- Payroll calculation resolves salary from the applicable compensation revision.
- People lists/details display compensation for the selected period.
- UI copy explains when records affect payroll and that finalization does not send money.

### Fixed

- Selected period now survives reloads and route changes.
- Historical salary calculation no longer reads only the employee’s current salary.

## Milestone 1 — 2026-09-27

### Added

- Next.js 16, React 19, strict TypeScript, Tailwind 4, and real local Convex backend.
- Six-table schema, indexes, typed API bindings, validated queries and transactional mutations.
- Pure integer-paise payroll engine, exact decimal parsing, aggregation, overflow protection, period validation, and controlled state transitions.
- Idempotent internal seed for 24 people across five departments, contractors, recent joiner, salary-change audit event, August payroll history, September adjustments, and October draft.
- Responsive application shell, realtime dashboard, searchable/filterable employee directory, employee details and payroll history.
- Draft creation, atomic payroll generation, persisted totals and employee snapshots, payroll run navigation.
- Minimal direct HR adjustment entry with explicit confirm action, validation, live projections, and calculated-period locking.
- Activity feed, connection state, skeletons, empty/error/recovery states, accessible dialogs, and informative planned-feature pages.
- 50 passing financial/backend tests, read-only persisted-state smoke command, formatting checks, and persistent AI engineering memory.
- GitHub Issue templates and an issue-first work log requirement for future product and engineering changes.

### Fixed

- Native month field could display a new month without changing the subscribed payroll period; switched to the input event and verified month navigation.
- Sidebar could extend below short viewports; made the rail scrollable and verified responsive layouts.
- Next.js project root ambiguity caused by an unrelated parent lockfile; scoped Turbopack to this repository.

### Changed

- None; this is the initial implementation.

### Removed

- None.
