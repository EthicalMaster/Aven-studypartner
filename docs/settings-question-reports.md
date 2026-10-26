# Settings and question reports

Prepared 26 October 2026. Base: 3b0447e. Branch: feat/settings-question-reports.

## Install

Merge the bundle into a local preview branch, then run `npm run db:migrate`, `npm run test:settings-reports`, `npm run lint`, `npm run build` and `npm run dev`. Migration 023 is required before reporting works. No new environment variables, providers or dependencies.

## Acceptance

Save profile details and reload. Change or forget AI study defaults and inspect the next PDF setup. Sign in in a second browser, then sign out other sessions: the current session should remain active. Finish a quiz, report a question, then find the report under Settings. Re-reporting updates the same record and does not change the score.

## Verification

Passed TypeScript, production build, settings/report HTTP tests with real PGlite SQL, flashcard draft and PDF quiz regressions. Mocked-API Chromium checks passed at 390px and 1440px, including reload persistence, failed-save retention/retry, session removal and reporting retry; screenshots inspected. Live Neon/Render and Groq were not tested here. Existing Vite configuration and bundle-size warnings remain non-blocking.

## Limits

Reports are private feedback records with pending-review status. Admin review/correction UI, notifications and automatic answer/score changes are not included. Email changes and OTP/password recovery are not available yet. Session browser labels are untrusted display labels, not verified devices. Settings profile institution and saved AI exam authority are separate values.

## Rollback

Revert the application commit if needed. The additive migration can remain applied to retain reports; do not drop it or run a destructive database rollback as part of routine application rollback.
