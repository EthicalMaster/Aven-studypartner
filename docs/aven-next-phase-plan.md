# Aven: reliable AI learning and account improvements

Prepared: 25 October 2026
Status: Phase 1 in progress. First correction bundle adds durable Groq token reservations and removes fabricated fallback flashcards. Later phases remain pending.

## Goal and current baseline

Build a useful learning platform for school and university students generally. Correct, relevant learning content and responsible token consumption are release requirements, not optional polish. Existing baseline: deployed workspace redesign, PostgreSQL/pgvector retrieval, and Groq-backed PDF summaries with saved checkpoints. The user has reported that the summary deployment works. This plan does not imply that all live data or generation quality has been audited.

Keep the free-only budget. Do not enable paid billing, rotate keys to bypass quotas, or assume separate keys provide independent capacity. Reuse existing infrastructure where practical. Keep secrets server-side.

## Execution order

### Phase 1 — Inspect generation paths and establish quality/token controls

- [ ] Inspect current quiz and flashcard generation, PDF extraction, AI gateway, quotas and persistence before changing them. Trace why titles, headers and footers become flashcards.
- [ ] Establish representative evaluation fixtures: school theory, university theory, quantitative content, noisy headers/footers and non-academic PDFs. Include sparse/scanned documents and embedded instructions that must be treated as document data.
- [ ] Record the current baseline: factual support, answer correctness, coverage, duplicate rate, reading level, latency and actual provider token usage.
- [ ] Set bounded input, output, question counts, concurrency and per-user usage. Add an application-wide daily token allowance alongside provider limits shared with other projects.
- [ ] Reserve estimated usage atomically before a call and reconcile actual usage afterward. Account conservatively for failures with unknown usage; never silently treat them as free. Track input/output and reasoning usage when reported.
- [ ] Reuse extracted text and cache outputs by owner, document content, selected scope, academic context, generation settings, model and prompt version. Do not share private material across users.
- [ ] Persist job progress, prevent duplicate submissions, cap retries and repair calls, and stop clearly on quota exhaustion. Do not retry indefinitely or automatically fall back to paid providers.
- [ ] Use deterministic validation first. Use additional model validation selectively and within the same budget; repeated LLM calls are not a substitute for measurable quality.

Acceptance: token accounting and failure handling are tested; a reviewed evaluation rubric and release thresholds exist before generation features ship. No malformed, duplicate or structurally invalid items pass validation. Factual accuracy requires source review, not merely valid JSON.

### Phase 2 — Brief academic context setup

- [ ] Reuse existing profile information, with a short confirmation/edit step for each generation.
- [ ] School path: board/curriculum, class/grade and subject. School name is optional unless it materially helps identify a source.
- [ ] University path: awarding/affiliating university or autonomous institution, course/program, year/semester and subject. College name alone may not identify the exam authority.
- [ ] Ask only missing relevant fields; avoid long forms. Allow unknown/other values and editable suggestions extracted from the PDF.
- [ ] Keep quiz length and difficulty simple. Remember preferences without silently applying stale academic details.
- [ ] Store normalized context separately from display labels so it can later map to the revised curriculum database.

Acceptance: both education paths work without institution-specific hardcoding, and a returning user need not repeatedly enter the same details.

### Phase 3 — Grounded PDF quizzes and optional exam-source research

- [ ] Integrate generation with existing quiz-taking, server-side grading, attempts and results.
- [ ] Start with 5 or 10 single-answer MCQs, easy/medium/mixed difficulty, and whole-document or selected-page scope.
- [ ] Generate from original PDF passages, not summaries alone. Select passages across the requested topics, rather than only similarity-search hits.
- [ ] Add controlled web research using academic context. Prefer official syllabi, institutional repositories, board sample papers and identifiable PYQs. Verify institution/board, program, subject, semester and date/version.
- [ ] Cache reusable public source metadata and exam-pattern research by academic context. Bound search calls, retrieved pages and extracted text. Do not send the student's private PDF text to a web search engine.
- [ ] Use exam sources to inform question style and emphasis; the selected PDF remains the declared content scope. Flag syllabus/content mismatches instead of silently introducing unrelated material.
- [ ] Fall back transparently to document-grounded practice when suitable papers cannot be verified. School board papers may exist even when school-specific papers do not.
- [ ] Label generated practice separately from authentic sourced PYQs. Preserve source URLs and provenance. Do not imply predicted questions are guaranteed to appear in an exam.
- [ ] Validate option uniqueness, answer references, question duplication, source-page references and explanation consistency. Check mathematical answers with deterministic methods where feasible.
- [ ] Keep answers off the client until submission. Save generated sets and attempts; reopening should not regenerate.
- [ ] Provide a report-question action and correction/review workflow. Do not automatically promote generated items to the verified public bank.

Acceptance: end-to-end tests cover ownership, grading, persistence, quota failure and resume. Representative generated sets pass the agreed human-reviewed rubric; unsupported source claims and invented PYQ attributions block release.

### Phase 4 — Meaningful PDF flashcards

- [ ] Detect repeated page furniture, isolated headings, page numbers, contents lists and extraction artifacts. Preserve meaningful definitions/formulas even when short.
- [ ] Use headings to identify topic context, not as standalone question material.
- [ ] Build cards from meaningful passages: definitions, relationships, causes, comparisons, formulas with conditions, worked concepts and applications.
- [ ] Require self-contained questions and focused answers, with source references. Reject vague prompts such as “What is Unit 2?” and cards requiring missing context.
- [ ] Deduplicate against the new batch and the user's existing deck. Allow preview, edit and selection before saving.
- [ ] Integrate with current spaced practice and review history. Reuse the token controls, persistence and validation foundation.

Acceptance: header/footer fixtures generate no artifact cards; a reviewed sample demonstrates useful retrieval practice rather than paraphrased headings.

### Phase 5 — Password recovery and account security

- [ ] Inspect current authentication, password hashing, sessions and email infrastructure. Select a transactional email option compatible with the budget; verify sender/domain requirements before integration.
- [ ] Add Forgot password → email OTP → verified reset flow with neutral account-existence responses.
- [ ] Use cryptographically random, short-lived, single-use codes stored securely; invalidate old codes on resend. Limit sends, verification guesses and reset attempts independently by appropriate account/IP controls.
- [ ] Count only successfully committed password resets: maximum two per month. Sending an OTP, failed verification, expired codes or failed password writes must not increment the successful-reset count.
- [ ] Clarify before implementation: calendar month versus rolling 30 days; whether the same cap applies to signed-in password changes; handling a compromised account that has reached the cap.
- [ ] Enforce the final reset allowance, OTP consumption, password update and success record atomically so concurrent requests cannot bypass the cap.
- [ ] Require appropriate verification for signed-in password changes and sensitive account edits. Invalidate relevant sessions after reset and notify the account owner.
- [ ] Never log codes, passwords, reset credentials or email-provider secrets.

Acceptance: tests cover expired/reused/wrong OTPs, send throttling, neutral responses, concurrent resets, rollback without quota consumption, and the agreed monthly boundary. Verify delivery and recovery using a controlled test inbox.

### Phase 6 — Useful Settings and consistent helping guide

- [ ] Organize Settings into Profile, Academic details, Account, Password & security and relevant Preferences.
- [ ] Connect editable fields to persisted server data with validation and clear save/error feedback. Show verified/read-only fields honestly; email changes require verification rather than a direct text overwrite.
- [ ] Expose appropriate session/sign-out controls supported by the backend and the successful-reset allowance once its policy is settled.
- [ ] Apply the approved ivory/navy/sage palette, typography, spacing and control styles to the home helping/onboarding guide, including mobile, keyboard and reduced-motion behavior.

Acceptance: saved details survive reload and affect the correct generation defaults; sensitive changes require verification; the guide is visually reviewed at desktop and phone widths.

### Phase 7 — Later curriculum database audit and reorganization

Begin after the preceding features are stable. Inspect first; the final schema and migration depend on evidence. Do not bulk rewrite or delete the current bank without an audited mapping and backup.

- [ ] Inventory actual tables, seeds, subjects, questions, relationships, academic filters, duplicate entries, orphaned records, answer errors and provenance gaps. Identify effects on existing attempts and spaced-practice history.
- [ ] Produce an audit report and proposed normalized mapping before mutations.
- [ ] Candidate school hierarchy: board/curriculum → class → subject → unit/topic.
- [ ] Candidate university hierarchy: exam authority → program → curriculum version → year/semester → subject → unit/topic. Model colleges separately where they share an affiliating university.
- [ ] Support shared subjects with contextual mappings rather than blindly duplicating whole banks per institution.
- [ ] Separate verified curriculum questions, identifiable sourced PYQs and AI-generated private practice. Track provenance, review status, difficulty, version and source year.
- [ ] Assess question quality and syllabus coverage; quarantine questionable records for review rather than silently destroying them.
- [ ] Back up, test reversible migrations on an isolated database, preserve identifiers/history and compare counts/mappings. Seed verified additions incrementally.
- [ ] Review the proposed changes with the user before applying a broad production curriculum rewrite.

Acceptance: evidence-based schema/mapping review, tenant isolation and migration tests pass; no lost study history or accidental relabeling of generated material as verified questions.

## Delivery and verification for each phase

1. Inspect the current deployed branch and relevant code/data; do not assume an older bundle is still authoritative.
2. Implement on an isolated feature/preview branch. Provide a verified Git bundle and exact Windows setup instructions.
3. Run targeted backend tests, TypeScript/build checks and UI checks where relevant. Clearly distinguish mocked tests from live provider/email/database validation.
4. Check output quality with representative real documents using the user's privately configured key. Record failures and token cost; choose/change the model based on measured results.
5. State migration/environment changes and rollback behavior. Test locally before publishing to the Render deployment branch.

## Decisions still required at the relevant phase

- Exact reset-window semantics and scope, plus compromised-account recovery policy.
- Transactional email service and verified sender availability.
- Free-compatible web search/source retrieval service and its actual quotas.
- Numeric token budgets and quality thresholds after baseline measurements.
- Final curriculum hierarchy and migration mapping after the later database audit.

## Progress tracker

- [x] User-confirmed working PDF summary deployment.
- [x] Consolidated execution plan prepared.
- [ ] Phase 1: quality and token foundation.
- [ ] Phase 2: brief academic context.
- [ ] Phase 3: PDF quizzes and exam-source research.
- [ ] Phase 4: meaningful flashcards.
- [ ] Phase 5: password recovery/security.
- [ ] Phase 6: Settings and helping guide.
- [ ] Phase 7: curriculum database audit and redesign.


## Phase 1 correction log — 25 October 2026

- Completed: Groq-wide PostgreSQL daily token reservation cap, atomic concurrent admission, idempotent actual-usage reconciliation and conservative retention when usage is unknown. Scope is this Aven deployment, not other projects sharing a Groq account. Default 100,000 tokens/day is an initial configurable cap, not a statement of provider quota.
- Completed: removed flashcard fallback that converted first-chunk sentences into generic cards after any provider error. This prevents failures being disguised as successful generation; it does not yet complete the meaningful-flashcard redesign.
- Finding: flashcard input selects only the first four chunks, up to 1,000 characters each. This biases generation toward front matter and needs replacement with meaningful, representative passage selection in the planned quality phase.
- Validation: isolated PostgreSQL-compatible budget tests and summary regression tests; TypeScript and production build. No live model quality benchmark performed.
- Next: representative content fixtures, cleaning and passage selection, structured generation review and the agreed quality rubric. Academic setup and quizzes follow afterward.

### Phase 1 correction 2

- Replaced first-chunk flashcard input with bounded passage selection distributed across extracted pages.
- Added heuristic page-furniture filtering and required exact evidence quotations with batch duplicate/vague-question rejection.
- Passed targeted synthetic tests and TypeScript/build checks. Live factual quality evaluation remains pending.
- Full flashcard workflow (persistent citations, deck-wide duplicates, preview/edit), academic setup, quizzes and later phases remain open.
