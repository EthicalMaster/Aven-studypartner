# Brief academic setup — first integration

New document flashcard generation now asks for study level, exam authority, class/year/semester, subject and (university only) course/program. Existing profile fields and the document subject prefill applicable inputs. Institution is not assumed to be an awarding university. Unknown authority is accepted. Switching study level clears authority and stage so school details cannot silently carry into university fields.

The same discriminated schema validates both paths on the server. Context is sent as structured data in the generation prompt; it guides language/complexity, while the PDF remains the factual source. Subject is persisted on new cards. Existing decks bypass setup and are reused unchanged. Missing or invalid context blocks new generation before an AI call.

This is the first academic-context integration, for flashcards. It does not add web research, PYQs, PDF quiz generation, or profile editing. Per-generation context does not update the profile and is not yet stored as a reusable preference or dedicated provenance record. Those capabilities remain on the plan. The modal explains these limits.

## Preview

Start from deck-reuse commit 454b7fe on the deployment branch, with clean tracked work. Save the bundle to Downloads.

```powershell
git switch fix/neon-retrieval
git bundle verify "$HOME\Downloads\aven-academic-generation-setup.bundle"
git fetch "$HOME\Downloads\aven-academic-generation-setup.bundle" feat/academic-generation-setup
git switch -c preview/academic-generation-setup
git merge FETCH_HEAD
node --import tsx server/test/academic-context-generation.test.ts
npm run lint
npm run build
npm run dev
```

No migration or environment changes. From Flashcards → My Study Materials, choose a document with no saved cards and generate. Confirm university defaults, switch to school to verify the alternate labels, and complete the fields. Existing document decks should continue to reuse cards without setup or another provider call.

Tests cover schema validation, unexpected/oversized fields, both education paths, missing-context rejection before inference, context passed to a mocked provider and the selected subject passed to persistence. Live model appropriateness still requires reviewing real generated cards.

Browser verification: isolated component harness with mocked signed-in profile; tested both paths, prefilled fields, switching clears incompatible values, submission, mobile overflow and Escape. Mobile screenshot was visually inspected. This is not a live Groq end-to-end test.
