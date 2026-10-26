# Aven consolidated release batch

26 October 2026. Base commit: c8df502. Branch: feat/release-completion-batch. No push or deployment performed.

## Included

- Forgot password with email code; signed-in password changes; shared allowance of two successfully committed changes in a rolling 30 days. OTP sends, wrong codes, unchanged passwords, and transaction failures do not consume it. All sessions are revoked on success.
- Codes expire after 10 minutes, are HMAC protected and single-use; latest resend replaces the previous code. Five guesses per code, one request per email per minute, five per email per day, durable IP limits for recovery. Generic responses avoid exposing account eligibility.
- Optional Brevo or Resend HTTPS delivery, no new SDK, no automatic provider fallback. Shared application sending counters limit attempts to 90 per 24-hour window and 2,700 per 30-day window. Provider/account limits still apply and may use different boundaries. Failed sends conservatively retain reservations.
- Saved-card question/answer editing with ownership, stale-write and exact-duplicate checks. Source snapshots, scheduling and review history are preserved. Drafts flag high wording overlap for human review; this is not semantic or factual verification.
- Allowlisted reviewer desk in Settings, status/response history and student-visible responses. Microsecond-precise version checks avoid lost concurrent updates. Re-reporting reopens the case. It does not silently alter questions or historical scores.
- PDF quiz controls: up to 5 questions / 10 minutes or 10 / 15 minutes; easy, medium, hard or mixed; optional PDF page positions. One model call, maximum 2,500 or 4,500 output tokens, existing 6,000-character source budget. Existing default cache keys remain reusable; non-default settings have distinct keys. Short valid sets are disclosed, not padded.
- Curriculum seed audit, safe read-only live audit command, Class/Grade filtering fix and corrected misleading quiz labels.

## Install and validate

Merge the bundle on a local preview branch, then run:

```powershell
npm run db:migrate
npm run test:release-batch
npm run test:settings-reports
npm run test:pdf-quizzes
npm run lint
npm run build
npm run dev
```

Migration 024 adds recovery/rate-limit tables, password-change events, report-review history and flashcard edit versions. It does not replace curriculum data. No dependency changes.

## Enable longer PDF quizzes

To enable new 10-question generations, set `AI_MAX_OUTPUT_TOKENS=4500` in local .env and Render, then restart. This is a per-request ceiling, not a new daily allowance. The existing app-wide token budget still applies. Five-question requests continue to request at most 2,500 tokens. With a lower configured ceiling, the app blocks a new 10-question request before spending tokens rather than silently truncating it; previously saved papers still reopen.

## Email activation — required before real OTP delivery

No existing sending service was found in the repo. Supabase storage credentials are not an Aven authentication/email service. Do not paste API keys or database credentials into chat.

Choose exactly one provider, enable transactional sending and verify the sender using its dashboard. Brevo and Resend adapters are included; no account is created or paid plan enabled by this bundle. Resend requires a domain you own. Provider restrictions and deliverability must be tested with your own inbox before opening recovery to students.

Set server-only environment variables in local .env and Render:

```dotenv
SECURITY_EMAIL_PROVIDER=brevo
SECURITY_EMAIL_FROM=your-verified-sender@example.com
BREVO_API_KEY=your-private-api-key
RECOVERY_HMAC_SECRET=your-generated-random-secret
```

For Resend use `SECURITY_EMAIL_PROVIDER=resend` and `RESEND_API_KEY` instead. Use a plain email address for SECURITY_EMAIL_FROM. Generate the secret privately:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Restart after changing environment variables. Missing configuration is shown clearly; the app does not pretend a code was sent. The availability indicator checks configuration, not actual inbox delivery. Request acceptance is neutral; email work runs after the HTTP response, without automatic retries. A server interruption may lose delivery; users can request a fresh code after the cooldown. Password-change notification is best-effort when email is configured. No durable email queue is included.

Verify with a controlled account: receive code; reject wrong/expired code; change password; confirm old sessions and password stop working; confirm new login; check notification. Do not consume both changes on your primary account for experimentation. At the cap, Settings shows the next available time. A compromised account at the cap requires operator-assisted identity verification; there is deliberately no automatic bypass. Do not reset limits merely on an unauthenticated request.

Source references checked 26 October 2026:
- https://developers.brevo.com/reference/send-transac-email
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/domains/introduction

## Reviewer access

Use your own Aven account's `users.id` UUID (not its learner ID) in `AVEN_REVIEWER_USER_IDS`. It can be read from the authenticated `/api/auth/me` response's `user.id`, or queried by email in your database console. Comma-separated IDs are allowed. Only trusted operators should receive this setting: it grants access to reported question snapshots and feedback from students. No account can grant itself permission through the UI. Leave empty to disable the desk.

## Proxy and retention

Auth rate limiting now uses Express's trusted client address, not an arbitrary first X-Forwarded-For value. Only set `TRUST_PROXY_HOPS=1` when your deployment is exclusively behind one trusted reverse proxy; otherwise leave unset and validate the hosting topology before configuring it. An unset value behind a proxy shares limits across users of that proxy.

Recovery rate-limit keys are HMACs except application-wide mail counters. Operators can periodically delete expired rows from recovery_rate_limits; do not delete active counters. Password-change events must retain at least the latest 30 days to enforce the allowance.

## Verification and limitations

Passed: TypeScript, production build, release-batch tests, Settings/report tests, PDF quiz tests, flashcard draft regressions and exam-source discovery regressions. Browser checks passed for recovery error/retry/success and unavailable sender, signed-in password changes, reviewer response, saved-card edit failure/retry, mobile overflow and quiz-option payloads. Phone and desktop screenshots were inspected. Existing Vite configuration/bundle-size warnings remain non-blocking.

Automated SQL/API tests use PGlite, real Express routes and mocked email delivery. PGlite's single connection is leased serially: production PostgreSQL row-lock contention was not load-tested. Browser checks use real components with mocked APIs. Live Neon, Render, inbox delivery, Groq answer quality and Tavily/full-paper authenticity were not tested here.

Remaining release gates: email activation/inbox verification; live curriculum inventory and approved mappings; representative factual-generation/token benchmarks; verified full-source exam research. Email address changes, true semantic duplicate detection and automatic report-driven regrading are not implemented. This batch is not a claim that every item in the original plan is complete.

## Rollback

Revert the application commit if needed, retaining additive migration 024 and its audit data. Never delete password-change events to roll back the UI; that would weaken the successful-change limit. No destructive seed or broad database rewrite is required.
