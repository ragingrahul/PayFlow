# Engineering rules

## Closed engineering loop

UNDERSTAND → PLAN → IMPLEMENT → RUN → TEST → VERIFY → (failure: DIAGNOSE → FIX → RETEST) → REGRESSION CHECK → POLISH → DOCUMENT → COMPLETE.
Never assume generated code works.

## Financial correctness

Use safe integer paise everywhere; never silently mix units. Deterministic calculations live outside React and are independently tested. Reject malformed financial data and invalid transitions.

## AI safety boundary

AI may interpret language, retrieve data, choose tools, propose actions, and explain results. AI may not manipulate arbitrary Convex records, bypass validation, silently alter payroll, independently approve it, or invent authoritative totals. Payroll-changing AI actions require a validated preview and explicit human confirmation.

## No fake functionality

No inert buttons, mocked successes, fake realtime, or hardcoded dashboard totals. Intentional demo seed data is allowed; mark future features clearly.

## Code quality and errors

Strict TypeScript, reusable components, modular services, meaningful names, minimal duplication. Preserve form inputs on failure, expose actionable errors, include loading/empty states. Preserve existing working behavior. Do not hide failures.

## Scope

Stay within the current milestone. No external integrations without approved scope.

## GitHub Issue workflow

Every feature, bug fix, refactor, schema change, and meaningful documentation change must have a GitHub Issue before implementation begins. The issue is the human-readable work log and must contain:

- the problem or requested outcome;
- scope and explicit exclusions;
- acceptance checks;
- material implementation decisions;
- verification results and known limitations.

Reference the issue number in commits and pull requests. Keep the issue open while work or verification remains. Close it only after the implementation, regression checks, and repository documentation are complete. Group trivial typo-only changes into the nearest relevant issue rather than creating noise.

## Documentation

After meaningful changes update PROGRESS, CHANGELOG, TEST_LOG, KNOWN_ISSUES, and HANDOFF. Record meaningful decisions and architecture/schema changes. Distinguish implemented and planned work. Never mark unverified behavior as passed. Inspect git status; preserve unrelated changes and never commit secrets or .env.local.
