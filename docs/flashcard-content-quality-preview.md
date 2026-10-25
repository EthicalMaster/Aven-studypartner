# Flashcard content quality — Phase 1, correction 2

Replaces first-four-chunk sampling with up to six passages distributed across extracted pages, within 6,000 source characters. Removes page-number lines, isolated unit/chapter labels, dotted contents entries and short repeated edge lines. Keeps short facts/formulas with their surrounding explanation. This is heuristic filtering, not perfect layout recognition: unusual documents require review. Overlong unbroken sentences above 1,500 characters are omitted; sparse output is rejected rather than converted to placeholder cards.

Generation requests one to six cards, with an exact source quote for each. Server validation rejects missing/nonmatching evidence, exact duplicate questions/answers and common vague heading-based prompts before insertion. Source page numbers are saved as card tags. Supporting quotations are validated but are not yet persisted as dedicated citation fields. Quote matching establishes traceability, not semantic correctness. Existing cards are not deleted, and this update does not yet implement deck-wide duplicate detection, preview/edit approval or curriculum redesign.

The existing Groq budget remains in effect. No automatic retry/repair call is added. Document instructions are explicitly treated as untrusted source data. There was no live model key available for factual-quality testing.

## Local preview

Start from the deployed token-budget checkpoint (fc1c965). Save the bundle in Downloads, with clean tracked work:

```powershell
git switch fix/neon-retrieval
git bundle verify "$HOME\Downloads\aven-flashcard-content-quality.bundle"
git fetch "$HOME\Downloads\aven-flashcard-content-quality.bundle" feat/flashcard-content-quality
git switch -c preview/flashcard-content-quality
git merge FETCH_HEAD
node --import tsx server/test/learning-content.test.ts
npm run lint
npm run build
npm run dev
```

No new migration or environment setting. Existing migration 018 and Groq configuration are required. Test generation from a document with headers/footers and meaningful paragraphs; compare every card with its source. Verify concepts from later pages are represented when selected. Try a headings-only document: it should fail without adding junk cards. Old cards remain as before. Do not repeatedly generate into the same deck expecting deduplication; deck-wide deduplication remains planned.

## Verification

Synthetic fixtures cover distributed page selection, page furniture, sparse input, source-character cap, exact evidence, duplicate output and vague prompts. TypeScript/build pass. These do not establish live model quality; review the first actual generated set before publishing.
