# PDF practice quizzes — first integration

## Behaviour

Quizzes → Quiz from PDF → choose a processed document → confirm school/university details (including saved preferences) → paper preview → start → answer → submit → explanations and source quotes.

- One bounded AI request generates 1–5 four-option, single-answer MCQs. Ten-minute practice session, one mark per question, no negative marks. Existing question-bank papers remain available.
- Reuses cleaned, representative passages (at most six, 6,000 text characters) rather than sending the entire document. The gateway applies the existing daily token reservation, per-student request and concurrency limits; requested output cap is 2,500 tokens, clamped by configuration.
- Validates every question independently: bounded fields, four distinct choices, answer index, duplicate/vague questions and source-quote matching. A partially valid batch is saved with an omission notice. All-invalid output saves nothing. No automatic repair/retry/top-up requests.
- Quizzes and provenance save in one transaction. An advisory lock prevents simultaneous requests for the same student's PDF. A unique database key includes student, material, selected passages, academic context and generation version. Repeating unchanged input reopens the saved quiz without inference. Retaking from the quiz list always uses saved questions.
- Source quotes, page numbers, academic context, model and reported usage are retained. Quotes are shown with explanations after submission, not in active question payloads. Quiz creation does not add generated content to the shared question bank.
- Material ownership is checked before any AI call. Session creation now also checks quiz ownership; other students cannot start a private paper using its ID. Deleting a material keeps the saved paper and its attempt history, with the material FK set to null.

## Setup

Base commit: a1aee20 (flashcard validation fix). Branch: feat/pdf-quizzes.

Run `npm run db:migrate` before using the new feature. Migration 020 adds PDF provenance columns and a unique generation index, widens quiz subject to 120 characters to match academic setup, and permits question counts from 1 to 100 so valid partial batches can be saved. No curriculum content or historical questions are rewritten. Migration 019 remains required for saved preferences.

No new environment variables, API keys or packages. Existing Groq configuration is reused. Run migration against the intended database; a local `.env` change does not update Render's environment. If local and Render point to the same Neon database, the migration only needs to run once. Do not run seeds for this update.

Application rollback: switch back to the prior code commit. Leave migration 020 applied; its added nullable columns and widened constraints are backward compatible. Do not drop provenance or restore the old fixed question-count constraint while saved partial quizzes exist.

## Verification

- `npm run lint`, `npm run build`, `npm run test:pdf-quizzes`.
- Existing learning-content, academic-context-generation and flashcard-reuse regressions.
- PGlite applies actual migrations 001 (without pgcrypto extension), 006 and 020. Tests execute repository SQL for private paper creation, safe question payloads, session ownership, answer saving, 100% scoring of the fixture, result access restrictions, saved reuse, failed-write rollback, partial counts, context changes, 120-character subjects and material deletion with history retention. AI and advisory-lock responses are mocked.
- Playwright mobile 390px and desktop 1440px checks with mock API: processed-material filtering, saved details, generation-to-preview, partial warning, persistent error, saved-paper reuse, empty state and no runtime errors. Screenshots inspected: pdf-quiz-mobile-preview.png and pdf-quiz-desktop-setup.png.
- Known pre-existing build warnings: Vite config `__dirname` compatibility and large client chunk.

## Live acceptance checks

1. Generate once from a short school or university PDF with clear explanations. Confirm count matches the preview and all four options display.
2. Complete the paper; verify answer correctness and each quoted page against the PDF. A matching quote establishes provenance, not proof of logical correctness.
3. Return to Quizzes and repeat the saved paper. Reopen the same PDF with unchanged academic details; it should report reuse.
4. Confirm previously saved flashcards and Remember preferences still work.
5. After local acceptance, merge the preview branch into the deployment branch and push. Check the same flow after Render deploys.

Live Groq output has not been tested here because the user's key is not available. No web/PYQ search, guaranteed exam prediction, full-document coverage, semantic answer verification, OCR improvements or regeneration editor is included. Meaningful live quality evaluation remains required before expanding question types/counts.
