# PayFlow Marketing Launch Kit

## Positioning

**Category:** AI-native payroll operations for modern teams.  
**Tagline:** Payroll that thinks before you pay.  
**Short hook:** Ask. Preview. Approve.  
**Technical proof:** LLMs understand intent. Application code calculates money.

PayFlow should be remembered as the payroll project where HR can ask what a raise or bonus would cost, see the exact impact, and keep a human checkpoint before anything affects payroll.

## Current readiness

| Asset or post        | Status                           | Evidence or blocker                                                                                              |
| -------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Build announcement   | Ready to review                  | Landing and dashboard screenshots are captured from the real local app.                                          |
| Scenario Mode post   | Ready to review                  | Real October preview: 8 Engineering employees, +₹71,200/month, +₹8,54,400/year.                                  |
| AI architecture post | Copy ready; video blocked        | Provider adapters and safety gates are implemented. A live OpenAI/Inkeep acceptance run still needs credentials. |
| Convex realtime post | Copy ready; recording needed     | Hosted Convex and realtime UI data are verified; a two-view recording still needs capture.                       |
| Final launch post    | Blocked                          | Backend is hosted; requires a public frontend URL, live provider acceptance, final video, and submission link.   |
| LinkedIn launch      | Draft ready; blocked with launch | Publish with the final URL and video.                                                                            |

Do not present an item as launched until its link is recorded in `docs/DISTRIBUTION_LOG.md`.

## X post 1 — build announcement

**Media:** `public/marketing/landing.png` or `public/marketing/dashboard.png`  
**Status:** ready for founder review

> Building PayFlow for the Modern Stack Hackathon.
>
> It’s an AI-native payroll workspace where HR can ask:
>
> “What would an 8% Engineering raise cost?”
>
> PayFlow calculates the impact before anything touches payroll.
>
> AI interprets. Code calculates. Humans approve.
>
> Payroll that thinks before you pay.
>
> Built on @convex. More soon.

## X post 2 — Scenario Mode

**Media:** `public/marketing/scenario-mode.png`; replace with the 15–25 second clip when approved  
**Status:** ready for founder review

> One of my favorite PayFlow workflows: Scenario Mode.
>
> What happens if Engineering gets an 8% raise?
>
> → 8 people affected  
> → ₹21.10L → ₹21.81L monthly payroll  
> → +₹71,200/month  
> → +₹8.54L/year
>
> The preview uses deterministic payroll code and changes ₹0 of live compensation.
>
> Building for the Modern Stack Hackathon.

These numbers come from the current fictional Acme Studio dataset. Re-capture and re-check them if the seed or October payroll changes.

## X post 3 — AI architecture

**Media:** architecture card or live Copilot clip  
**Status:** wait for one live provider acceptance run

> AI should not calculate payroll.
>
> In PayFlow:
>
> AI → interprets intent  
> application code → resolves people + calculates paise  
> human → confirms the proposal  
> normal approval → decides whether payroll changes
>
> The model never becomes the financial source of truth.
>
> intent → tools → validation → preview → confirmation → approval → verification

Tag `@inkeep` only if the captured flow actually uses Inkeep. Tag `@OpenAIDevs` or `@OpenAI` only if the captured flow uses OpenAI.

## X post 4 — Convex realtime

**Media:** 15–20 second split-view recording  
**Status:** recording needed

> Added realtime payroll operations to PayFlow.
>
> Approve a compensation adjustment and:
>
> → projected payroll updates  
> → employee pay updates  
> → activity updates  
> → every subscribed view stays in sync
>
> No refresh.
>
> @convex is the source of truth underneath—not a database checkbox.

The recording must show the same fictional company and period in both views. Do not edit the video to imply an update that was not produced by the real mutation.

## X post 5 — final launch

**Status:** blocked until the production URL, demo video, and submission link work

> I built PayFlow for the Modern Stack Hackathon.
>
> PayFlow is an AI-native payroll workspace where HR can ask what a raise or bonus would cost, inspect the exact financial impact, and keep a human checkpoint before payroll changes.
>
> “What would an 8% Engineering raise cost?”
>
> PayFlow:
>
> → finds the eligible employees  
> → calculates monthly + annual impact  
> → saves an isolated preview  
> → changes nothing until the normal approval workflow
>
> Built with Next.js, TypeScript, Convex, [LIVE COPILOT PROVIDER], and optional Resend delivery.
>
> Demo: [PUBLIC URL]  
> GitHub: https://github.com/ragingrahul/PayFlow  
> Submission: [SUBMISSION URL]

Do not fill `[LIVE COPILOT PROVIDER]` until that provider passes the live acceptance flow.

## LinkedIn launch draft

> I built PayFlow for the Modern Stack Hackathon: an AI-native payroll operations workspace designed around a simple rule—AI can interpret intent, but deterministic application code must calculate money and humans must approve changes.
>
> The clearest example is Scenario Mode. An HR operator can model an 8% Engineering raise and immediately see the affected employees, new monthly payroll, and annual cost without editing anyone’s compensation.
>
> PayFlow also covers employee lifecycle management, effective compensation history, adjustment review, payroll finalization, activity, and employee payslips generated from immutable processed snapshots.
>
> Live demo: [PUBLIC URL]  
> GitHub: https://github.com/ragingrahul/PayFlow

## Verified sponsor handles

Verified on 2026-09-27 from sponsor or official documentation:

- Convex: `@convex` — use on realtime/backend posts.
- Inkeep: `@inkeep` — use only for a demonstrated Inkeep agent flow.
- OpenAI: `@OpenAI` or developer-focused `@OpenAIDevs` — use only for a demonstrated OpenAI flow.

Re-check the handle from the official sponsor site immediately before publishing. The [Convex hackathon page](https://www.convex.dev/hackathons/all-gas) explicitly recommends `@convex` and `@OpenAI`; [Inkeep’s community documentation](https://docs.inkeep.com/community/inkeep-community) explicitly recommends `@inkeep`; [OpenAI’s verified communications page](https://help.openai.com/en/articles/11725090-verifying-communications-from-openai) lists `@OpenAI` and `@OpenAIDevs`.

## Publishing gates

### Build announcement

- UI screenshot reviewed at full size.
- Copy matches current product behavior.
- No live-demo claim.

### Feature post

- Feature works in a clean run.
- Every number in copy matches the captured frame.
- Video starts with the interaction or result, not a logo slide.

### Final launch

- Public URL passes desktop and mobile smoke checks.
- One live Copilot provider flow passes.
- GitHub README and repository are public and current.
- Demo clip and submission link work without local services.
- No claim of production readiness, regulatory compliance, customer adoption, or money movement.

## Engagement rules

Respond to technical questions and genuine feedback. Explain how Convex subscriptions, deterministic paise calculations, and the confirmation boundary work. Do not ask sponsors repeatedly for attention, manufacture engagement, or paste PayFlow into unrelated conversations.

Primary effort remains product and submission quality. Publish three strong posts rather than five repetitive ones.
