# Changelog

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
