# Independent flashcard validation

Fixes the reported 12-character answer restriction and whole-batch rejection. Non-empty short answers (including Zero and 0) are accepted. The response envelope remains bounded to one through six entries; each entry then passes independent field, source and duplicate checks. Invalid entries are omitted; accepted entries save atomically. If none qualify, no cards are saved and the UI reports that failure. A partial-success response includes the rejected count and a notice displayed above the opened review deck. No second model call or automatic regeneration is added.

Evidence matching normalizes NFC Unicode, curly quotation marks and whitespace only. It preserves mathematical case, operators, exponents and punctuation, and prevents word/number substrings such as 0 matching inside 100. Quotes must still occur in the explicitly cited passage. This does not perform fuzzy paraphrase matching, mathematical equivalence checking or factual entailment verification. The specific quote that failed in the user's maths document was not available; a genuinely unsupported quote will still be rejected.

Duplicate questions are omitted, but repeated answers to distinct questions are allowed. Numeric answers are no longer mistaken for page-number furniture. Existing saved decks and review history are untouched; partial decks are reused by the existing workflow rather than automatically topped up on subsequent requests.

## Install locally

Base: saved academic preferences e543726. Remain on the branch containing that update (it need not already be pushed). Stop the server and keep tracked work clean:

```powershell
git fetch "$HOME\Downloads\aven-flashcard-card-validation.bundle" fix/flashcard-card-validation
git switch -c preview/flashcard-card-validation
git merge FETCH_HEAD
npm run dev
```

No new migration or environment change. Existing migration 019 from the preferences update remains required.

Try the two affected PDFs once. A successful subset opens with an omission notice; all-invalid output still fails explicitly. Check short answers and compare content with the source before publishing. No existing deck must be deleted or regenerated to install this patch.

Verification: passage-selection and validation fixtures (short/numeric answers, mixed batches, wrong sources, empty fields, changed signs/case/exponents, oversized envelopes); academic service test confirms only accepted cards reach persistence and rejection counts are returned; reuse regression; TypeScript and production build. Browser test with mocked API confirms accepted card display and partial-success notice. No live Groq calls or factual-quality evaluation were performed.
