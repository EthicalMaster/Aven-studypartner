# Account deletion and public usage

Migration 027 adds anonymous aggregate totals, a per-account AI-response marker that cascades on deletion, and a durable file-removal queue. Migration 028 makes 20 guarded content corrections from the supplied question export. Run migrations before deploying the new code. No new environment variables are required.

## What deletion does

Settings asks for the current password and literal DELETE. DELETE /api/auth/account authenticates the session, rate-limits attempts and validates the body. A transaction locks the user and profile, removes restrictive quiz references, authored review notes/events and email-linked recovery throttles, then deletes the user. Foreign-key cascades remove profile, sessions, learning records, materials, extracted pages/chunks, vectors, drafts, summaries, preferences and quotas. No other account is selected for deletion. Existing shared question-bank content is not personal account data.

A database trigger queues each deleted material's opaque storage key before its row disappears. The server tries up to 25 queued files every minute while running, and immediately after account deletion. A failure schedules retry in five minutes. The key is removed only after the storage adapter confirms deletion. This works with the configured local or Supabase adapter. Failed upload-row creation also queues an already-uploaded file. A sleeping host cannot run cleanup until it wakes. Storage configuration must continue pointing to the original provider/bucket until the queue is empty.

Run npm run storage:cleanup to process currently due keys and print aggregate pending/retrying counts. It never prints filenames or credentials. A nonzero pending count requires continued observation; do not call file removal complete while it remains nonzero. Investigate storage credentials and availability if retries persist.

Deletion clears the browser session cookie and reloads the public site. Other sessions immediately fail subsequent authentication. In-flight operations can finish computation, but foreign keys prevent deleted account records from being recreated. Already returned browser content and external provider logs cannot be recalled. Existing operator/provider backups follow their retention schedules; restoring a backup can restore deleted data unless the operator reconciles deletions. This implementation is application deletion, not a claim of provider-wide instantaneous erasure or legal compliance certification.

## Exactly what the public numbers mean

- Registered accounts: surviving student profiles at rollout plus registrations thereafter. It includes deleted accounts from this rollout onward, but cannot reconstruct accounts deleted before tracking began. A returning person who registers again counts as another account.
- Accounts with an AI response: one increment on the first successful gateway/provider response observed per account after rollout. Failed calls do not increment it. Later schema/content checks can still reject a provider response, so this is not a count of accurate answers, saved generations or improved learning outcomes. Counter failures can undercount; do not market it as audited analytics.
- Active learners in 30 days: distinct existing active users whose stored session last_seen_at falls within the last 30 days. It measures authenticated activity, not anonymous visitors or concurrent users. Session cleanup can change the retrospective count.

The endpoint returns only aggregate numbers and the tracking start date. Its responses allow a 60-second cache; the frontend fetches on mount and hides the section if unavailable. No fabricated fallback statistics. Identity-linked AI markers disappear on deletion while anonymous lifetime totals remain. Global token/search/email reservation totals also contain no user identifiers. Short-lived IP-derived security throttles expire and are removed by the cleanup loop.

## Validation and deployment

Real PGlite SQL and HTTP tests cover all migrations, wrong password, missing confirmation, authentication, revoked sessions, cascade deletion of documents/vectors/quizzes, isolation of another account, retry after storage failure, preserved lifetime counts and one-time AI-account increments. Browser checks use mocked API responses for the form and public totals. Live Supabase deletion and deployed Render behavior remain operator acceptance checks.

Use a disposable account to test in production. Upload one small document, generate an AI response, note the totals, then delete the disposable account. Verify login fails, records are absent, storage cleanup finishes and cumulative totals remain. Do not use your main account as the test fixture.
