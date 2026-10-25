# Document deck reuse and atomic saves

This correction reuses an existing student's document deck before making another AI call. PostgreSQL session advisory locks prevent simultaneous generation for that same student/material; a busy request receives a retry-later message. The lock connection is released in all paths, and discarded if unlock fails. A server disconnect releases the lock. All cards in a generated batch now commit or roll back together.

Existing cards, edits and spaced-review history remain unchanged. This is reuse of an existing deck, not semantic deduplication or content-version regeneration. Existing duplicates are not removed. Reprocessing a document does not replace its saved deck. Explicit regenerate/replace with preview remains future work. An existing deck response returns up to 100 cards; dashboard loading retains its normal pagination. The legacy totalGenerated field remains for compatibility, but messages now say the deck is ready rather than claiming every call generated new content.

No migration or environment changes. Requires the previous flashcard-content-quality bundle (368a1d9).

```powershell
git switch fix/neon-retrieval
git bundle verify "$HOME\Downloads\aven-flashcard-deck-reuse.bundle"
git fetch "$HOME\Downloads\aven-flashcard-deck-reuse.bundle" feat/flashcard-deck-reuse
git switch -c preview/flashcard-deck-reuse
git merge FETCH_HEAD
node --import tsx server/test/flashcard-reuse.test.ts
npm run lint
npm run build
npm run dev
```

Local acceptance: generate cards for a new document; note count and any review progress. Request generation again: the count and existing review progress must remain unchanged. Try simultaneous requests from two tabs: only one should generate. Existing old-quality cards remain until deliberately edited/deleted; this patch never automatically deletes them.

Validation: mocked service/repository tests for ownership before lock, reuse preserving review state, lock release for busy requests, and transaction commit/rollback behavior; existing passage-selection tests; TypeScript and production build. Live PostgreSQL lock behavior and Groq usage should be confirmed during local acceptance. No production push/deployment performed.
