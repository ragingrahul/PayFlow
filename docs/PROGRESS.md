# Current Milestone

Milestone 4 — AI Payroll Copilot

# Goal

Let payroll operators ask natural-language questions and prepare reviewable adjustments while deterministic code retains authority over employees, money, impact, and mutations.

# Current Status

Milestone 4 is implemented and verified locally. OpenAI Responses function calling is the default provider; an Inkeep Chat API tool-calling adapter uses the same controlled tools. Conversations and proposals persist in Convex. Live external-provider execution awaits user-supplied credentials; the unconfigured browser state is verified and does not simulate responses.

# Completed

- [x] OpenAI Responses API tool loop using the official JavaScript SDK and `store: false`.
- [x] Inkeep OpenAI-compatible Chat API tool loop with server-only credentials.
- [x] Deterministic read tools for payroll context, employee lookup, and adjustment filtering.
- [x] Structured bonus, reimbursement, and deduction proposal tool with exact INR-to-paise parsing.
- [x] Convex-backed conversations, messages, proposal previews, status, and activity.
- [x] Proposal source snapshot and confirmation-time revalidation.
- [x] Explicit confirm creates a pending adjustment only; the existing Adjustments approval remains mandatory.
- [x] Rejection reason becomes conversation context for a corrected follow-up.
- [x] Honest missing-provider setup state with disabled chat.
- [x] 73 tests, lint, typecheck, formatting, production build, persisted-data smoke, and browser UI verification.

# In Progress

- None. Milestone 4 application work is complete.

# Next Actions

1. Add one provider’s server-side credentials and run live OpenAI or Inkeep conversation checks.
2. Start Milestone 5 with the employee portal and payslip presentation.
3. Add Resend only when the payslip artifact and recipient flow are ready.

# Blockers

- Live external-provider calls cannot be exercised until `OPENAI_API_KEY` or the three Inkeep variables are supplied. All local deterministic and persistence paths are verified.

# Important Current Context

Copilot never calls arbitrary Convex mutations. Its provider tools read a bounded context and may return one proposal draft. `recordTurn` resolves and recalculates that draft in Convex. `confirmProposal` compares the current source snapshot to the saved proposal, then creates one pending adjustment transactionally. Payroll changes only after a separate adjustment approval.

# Last Verified

2026-09-27 (Asia/Kolkata): 73 tests across three files, lint, typecheck, format check, production build with 11 routes, persisted September smoke at 216845050 paise, and desktop-browser verification of the Copilot setup state and human-approval messaging.
