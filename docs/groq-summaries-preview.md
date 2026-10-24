# Groq + PDF summaries preview

## Included

- Server-only Groq provider, configurable model (initial candidate `openai/gpt-oss-20b`), strict JSON generation, bounded request timeout including response body, normalized errors and token usage metadata.
- My library → Summarize PDF: select a processed document, generate, pause, resume and reopen saved summaries. The former outline-only summary modal is replaced. No AI quiz/flashcard generation is added yet.
- Ordered coverage of all readable extracted pages. Up to 84,000 extracted characters and 16 parts; longer documents are rejected rather than silently truncated. Each part is up to 7,000 source characters. Results remain separate topic summaries; no extra synthesis call.
- Server validation of shape, lengths and citation page membership. This does not prove factual support; check actual generated facts and formulas against the source.
- PostgreSQL checkpoints with content/model/version cache invalidation, an atomic per-document lease to prevent duplicate work, and material-deletion cascade. Ownership is checked using the authenticated student profile.
- Each POST processes one part. The browser requests the next part while open. Closing or pausing stops further requests; the current server request may finish. Reopening and clicking Resume continues saved work. A terminated server's lease expires after the configured timeout plus 30 seconds. This is a resumable workflow, not an always-running background worker.
- No automatic provider retries or key rotation. A failed part is retried only when the user resumes. Completed parts are reused. A crash after provider completion but before database commit can require that part to be generated again.
- Existing daily per-student quota applies per part/attempt, not per PDF. Existing concurrency gates apply per server process. When configured database quota tracking fails, generation now fails closed. Cached summaries do not consume generation requests.

## Install locally

Start from the latest workspace redesign on `fix/neon-retrieval` (base commit a114f88). Keep tracked work clean and leave uploads and secrets untracked.

```powershell
git switch fix/neon-retrieval
git bundle verify "$HOME\Downloads\aven-groq-summaries.bundle"
git fetch "$HOME\Downloads\aven-groq-summaries.bundle" feat/groq-summaries
git switch -c preview/groq-summaries
git merge FETCH_HEAD
notepad .env
```

Update these existing settings; do not add duplicate entries. Replace the placeholder key privately:

```dotenv
AI_PROVIDER=groq
AI_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=your_actual_key
AI_REQUEST_TIMEOUT_MS=45000
AI_MAX_INPUT_CHARS=20000
AI_MAX_OUTPUT_TOKENS=2500
AI_MAX_CONCURRENT_PER_STUDENT=1
AI_MAX_GLOBAL_CONCURRENT=1
AI_REQUESTS_PER_DAY=20
```

The adapter requests up to 2,500 completion tokens per part. The gateway clamps this to the configured maximum. The model is a candidate, not a claim of best accuracy. Model access and your shared organization quota must be checked with a live request. Keep your existing DATABASE_URL, storage and embedding settings.

```powershell
npm run db:migrate
npm run lint
npm run test:summaries
npm run build
npm run dev
```

Migration 017 only adds `material_summaries`; it does not rewrite existing material/vector tables. If your local DATABASE_URL points to the live Neon database, this migration adds the table there as well. No new package installation is required if dependencies are already installed.

## Local acceptance test before publishing

1. Sign in, open My library → Summarize PDF. Use a short, text-based PDF first.
2. Generate and check the factual content and cited PDF pages yourself. Formula-heavy content needs particular attention. Scanned/image-only pages are not newly OCR'd by this feature.
3. Close and reopen: a completed result should appear without generation. On a longer PDF, pause and resume and confirm completed parts remain.
4. Test a second account: it must not see the first account's material or summary.
5. Verify existing upload, retrieval and practice features still work.

No real Groq key was available during development. Live output quality, your account's model access, quota behavior and deployment connectivity are not verified. Generated text is rendered as text, not HTML. The UI tells users their extracted text is sent to Groq.

When the preview is accepted, set the same server-only AI variables in Render and publish the branch to the deployment branch. Apply migration 017 against the deployment database before enabling the feature. Do not commit .env. Switching code back leaves the additive summary table harmlessly in place; rolling back migration 017 deletes saved summaries.

## Verification performed

- TypeScript and production build pass; existing Vite configuration/bundle-size warnings remain.
- `npm run test:summaries`: temporary PGlite database and mocked provider. Tests full text coverage, empty/oversize rejection, citation validation, ownership, concurrent deduplication, checkpoint persistence across database restart, expired-lease recovery, caching and source invalidation, safe failures, Groq response/error parsing, fail-closed quotas and deletion cascade.
- Existing AI gateway suite: 18 assertions pass via `node --import tsx server/test/ai-gateway.test.ts`. The tsx CLI's IPC socket was unavailable in this execution environment.
- Chromium with mocked API data: document selection, two-step generation, saved result/citations, reopening, mobile layout, Escape dismissal and quota-error state. Screenshots are illustrative fixtures, not real model output.

References: https://console.groq.com/docs/structured-outputs and https://console.groq.com/docs/models (checked October 25, 2026).
