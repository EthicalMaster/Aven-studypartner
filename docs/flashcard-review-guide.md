# Paired delivery: flashcard drafts + study guide

Prepared 26 October 2026. Branch: feat/flashcard-review-guide.
The bundle starts at 4decf38 (PDF quiz delivery) and includes c67c5c0 (optional exam-source discovery), so that previous bundle does not need to be installed separately.

## Larger task: review generated flashcards before saving

New document flashcards now become a private, saved draft. They do not enter the deck or spaced review until the student selects and saves them. Students can edit question, answer, concept, formula and difficulty, deselect unwanted cards, and inspect the original evidence/page number.

A pending draft appears as Resume draft on the material card and reopens without another model call or repeated academic setup. Generated drafts survive page reloads and restarts. Edits are saved only when adding the selected cards; leaving the preview discards unsaved edits while keeping the original generated draft.

The commit transaction locks the draft row, validates selected IDs and bounded fields, rejects duplicate normalized questions within the selection or existing document deck, inserts only selected cards and records the committed IDs. A repeated Save request returns the saved cards, rather than inserting again. Genuine failures roll back every insertion. If the save committed but its response was lost, retrying is safe.

Source text/page is copied from the server-side draft, never accepted from editable client fields. User-edited cards are labelled and retain the original generated evidence; edits are not automatically fact-checked. Evidence is available after revealing the answer. Older cards without stored evidence say so; quotes are not fabricated or retroactively generated. Existing cards and review history are not rewritten.

Deduplication preserves mathematical case, signs and punctuation. It detects exact normalized questions, not all semantic near-duplicates. Existing saved-card editing and broader quality benchmarks remain future work.

## Smaller task: helping-guide theme and usability

Restyled the existing six-step academic/helping guide to the workspace ivory/navy/sage palette and editorial heading font. Added a native modal dialog with focus containment, Escape/Close support, focus restoration and background scroll lock. Checked mobile wrapping, all six steps, profile completion and reduced-motion mode. Updated outdated question-count/verified-bank claims and document-generation descriptions. Profile and onboarding APIs remain unchanged.

## Apply and verify

Run `npm run db:migrate` before starting the new application. Pending migration 021 supports the included optional source-discovery feature. Migration 022 adds durable drafts and source/edit metadata, widens flashcard subject to 120 and key concept to 160 characters to match accepted inputs. Both are additive. No seed or bank rewrite.

No new key is required for flashcard drafts or the guide. Optional search still needs TAVILY_API_KEY as documented in exam-source-discovery.md. Existing Groq limits apply to generating a new draft; reviewing, editing, resuming and saving a draft add no AI calls.

Passed:
- TypeScript and production build (existing Vite config/large-chunk warnings remain).
- `npm run test:flashcard-drafts`: actual PGlite migrations/repository SQL, private ownership, draft reuse, zero deck writes before approval, immutable source fields, selected-only saves, duplicate rejection, rollback, idempotency, mastery preservation, pending-draft badges and retained source snapshots after material deletion. AI and advisory locks are mocked.
- PDF quiz, source research, learning-content, academic-context and flashcard-reuse regression tests.
- Mock-API browser integration: generate → preview → leave → resume without academic form, edit/select, failed save retaining edits, retry → review → keyboard-accessible evidence; guide Escape/focus restoration, six-step mobile flow, profile completion and desktop screenshots. Screenshots were visually inspected using the real workspace CSS wrapper.

Local acceptance:
1. Choose a PDF without an existing deck. Generate, edit one answer, deselect one card, inspect evidence and save.
2. Check saved count, edited wording and source evidence after flipping. Existing decks should still open with their prior mastery/history.
3. On another PDF, leave the generated draft and use Resume draft. This should not consume another AI request.
4. Open the home/header guide and check mobile/desktop navigation and Close/Escape.

Live Groq factual quality was not tested here. This delivery changes review/persistence rather than the model or generation prompt. Review edited answers against the source.

Rollback: restore the previous application version while leaving additive migrations applied. Do not drop draft tables if pending student drafts must be preserved. Older application versions will not show drafts; they retain the earlier immediate-save behaviour.
