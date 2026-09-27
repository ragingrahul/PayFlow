# PayFlow Demo Script

Target length: 4–5 minutes. Use the seeded Acme Studio workspace and September 2026 unless a step says otherwise.

## 1. Frame the product — 30 seconds

Open `/welcome`. Explain that PayFlow is a realtime payroll operations workspace for growing Indian teams. Point out the promise: one employee-to-payslip record, human approval for financial changes, and no claim that the demo moves money or calculates statutory tax.

## 2. Show the operating record — 45 seconds

Enter the HR workspace. On Dashboard, show the selected period, payroll totals, departments, and live activity. Open Payroll and explain the five-state workflow. Open the processed August run to show the locked employee snapshots.

## 3. Show employee lifecycle — 60 seconds

Open People. Use **Add person** to show validated onboarding and the first effective compensation record; cancel before saving if the demo dataset must remain pristine. Open an employee to show the salary timeline, payroll history, edit form, scheduled employment end/reactivation workflow, and portal preview. Explain that changes which would rewrite calculated history are rejected.

## 4. Show safe planning — 45 seconds

Open Scenarios for October. Preview an 8% Engineering raise, save it, inspect affected people, then discard it. Explain that the snapshot is isolated and cannot apply compensation changes.

## 5. Show the Copilot approval chain — 60 seconds

If a provider is configured, ask for a read-only payroll summary, then ask for a bonus proposal. Reject one proposal with a correction, let the provider revise it, confirm it, and show that it becomes a pending adjustment. Open Adjustments and explain that a second normal approval is still required before payroll changes. If no provider is configured, show the exact missing-key state and explain that PayFlow never simulates an AI answer.

## 6. Show the employee result — 45 seconds

Open Employee portal and select a person with an August payslip. Open the payslip, point out that it comes from the processed payroll snapshot, and use **Print / save PDF** to show the browser print path. If Resend is configured, deliver only to an authorized test address and show the delivery audit; otherwise show the named missing variables.

## 7. Close — 20 seconds

Return to `/welcome`. Summarize the demonstrated chain: onboard a person, review effective compensation and adjustments, lock payroll, and give the employee a stable payslip. State the remaining production work plainly: identity/RBAC, statutory calculations, bank integrations, and hosted operations.

## Pre-recording checklist

- Start local Convex and Next.js; confirm the green realtime indicator.
- Run `npm run seed` and `npm run smoke`.
- Use a clean browser window at 1280px or wider and keep zoom at 100%.
- Decide in advance whether provider/email steps are live or configuration-state demonstrations.
- Never enter a real employee, salary, provider secret, or unauthorized recipient in the demo.
