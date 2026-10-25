# Phase 1 — first corrections

Adds migration 018 for application-wide daily Groq token reservations. Set `AI_DAILY_TOKEN_BUDGET=100000` initially or choose a lower allowance. This is a conservative Aven budget, independent of and additional to provider quotas; other projects using the same Groq organization also consume its quota.

Before each Groq generation, reserve UTF-8 input bytes plus protocol allowance and maximum completion tokens. This deliberately overestimates ordinary text usage, so large requests may be blocked even when exact tokenization would fit. On a response with reported total usage, reconcile once. Unknown usage, interrupted calls and failed requests retain the reservation until the UTC day ends. No automatic retries or key rotation. The two new tables must exist or generation fails closed. No prompts, responses or keys are stored in the ledger.

Removes the flashcard fallback that silently fabricated generic questions and first-sentence answers after AI failures. Existing saved cards remain untouched. The fuller passage selection and flashcard-quality work is still pending.

## Local preview

Start with clean tracked work on the deployment branch containing c891621 (Groq summaries). Save the bundle in Downloads.

```powershell
git switch fix/neon-retrieval
git bundle verify "$HOME\Downloads\aven-ai-budget-foundation.bundle"
git fetch "$HOME\Downloads\aven-ai-budget-foundation.bundle" feat/ai-budget-foundation
git switch -c preview/ai-budget-foundation
git merge FETCH_HEAD
npm run db:migrate
node --import tsx server/test/token-budget.test.ts
npm run test:summaries
npm run lint
npm run build
npm run dev
```

Keep the existing Groq settings. Optionally add `AI_DAILY_TOKEN_BUDGET=100000` to .env; this is also the default. Migration runs against the configured DATABASE_URL, including the live database if that is your local connection. Before deployment, migration 018 must exist there. Do not commit .env.

Verify a new summary and a cached summary locally. A depleted budget should return a clear error rather than generating fallback cards. Tests use synthetic data and mocked inference, not live Groq tokens. Existing Vite warnings remain. No production deployment or curriculum rewrite is included.
