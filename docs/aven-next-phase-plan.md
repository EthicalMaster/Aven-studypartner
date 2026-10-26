# Aven: reliable AI learning and account improvements

Prepared: 25 October 2026
Updated: 26 October 2026. Status: token controls, brief academic setup, saved preferences, meaningful flashcard generation and PDF practice quizzes are implemented; the user reports the quiz flow works. Source discovery, flashcard draft review and the guide correction were delivered; Settings and student question reporting are now implemented for local acceptance. Full source verification and remaining release work are open.

## Goal and current baseline

Build a useful learning platform for school and university students generally. Correct, relevant learning content and responsible token consumption are release requirements, not optional polish. Existing baseline: deployed workspace redesign, PostgreSQL/pgvector retrieval, and Groq-backed PDF summaries with saved checkpoints. The user has reported that the summary deployment works. This plan does not imply that all live data or generation quality has been audited.

Keep the free-only budget. Do not enable paid billing, rotate keys to bypass quotas, or assume separate keys provide independent capacity. Reuse existing infrastructure where practical. Keep secrets server-side.

## Remaining release scope — 26 October 2026

**The consolidated implementation batch is ready for local acceptance. Four release workstreams remain:** verified exam research, live content quality, live recovery delivery, and the curriculum migration. Settings is user-confirmed; email-address changes remain a separate enhancement.

| Phase | Status | Remaining work |
| --- | --- | --- |
| 3 — Quizzes and exam research | PDF quizzes, bounded length/difficulty/page controls, candidate source review and report review implemented | Live source/quality validation, full-paper/institution/year verification, syllabus mismatch handling; automatic regrading not implemented |
| 4 — Flashcards | Draft review, saved-card editing, source display, exact duplicate checks and wording-overlap hints implemented | Live factual quality review and true semantic near-duplicate handling |
| 5 — Account recovery | OTP and signed-in change flow implemented; successful-only rolling 30-day allowance tested | Email provider/sender activation, real inbox and production acceptance |
| 6 — Settings and helping guide | Guide, persisted profile, study defaults, session controls and report history implemented | Live acceptance; verified email/password changes depend on phase 5 |
| 7 — Curriculum data | Repository audit and read-only live audit tool implemented; Class/Grade bug fixed | Live inventory, sourced hierarchy/mappings, factual question review and history-preserving migration |

Phases 1–2 have working foundations but are not formally closed: representative quality/token measurements, remaining cache/version controls and normalized academic mappings still need review. Finish with an integrated live acceptance pass. This count describes the agreed release scope, not a promise that all future website work is finished.

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

### Phase 1 correction 3

- Existing document decks are reused before another provider call; simultaneous generation is guarded by a PostgreSQL advisory lock.
- Batch insertion is now transactional to prevent partial decks after failures.
- Existing review history is preserved. Semantic deduplication, source-version regeneration and preview/edit approval remain pending.
- Targeted mocked service tests and passage-selection regressions pass; live quality evaluation remains required.

### Phase 2 first integration — academic setup for flashcards

- Added brief school/university context form, profile/document defaults and shared server validation.
- Context reaches flashcard generation; existing decks are reused without asking again. Invalid/missing context stops new generation before inference.
- This does not yet implement persistent generation preferences, PDF quizzes or web/PYQ research. Academic-context provenance beyond persisted card subject remains pending.

### Phase 2 preference persistence

- Added optional server-persisted academic defaults keyed by authenticated profile, excluding document subject.
- Form loads and confirms saved defaults; Remember saves and Forget explicitly deletes. Load failure permits manual entry, save failure does not silently proceed.
- Migration 019 adds the dedicated preferences table. Existing profile and review history are untouched.
- PDF quizzes and web/PYQ research remain the next larger feature phase.

### Flashcard validation stability correction

- Removed arbitrary answer-length floor; accepts non-empty short/numeric answers.
- Per-card validation retains accepted cards and reports rejected count without extra model calls.
- Conservative evidence normalization preserves mathematical signs, exponents and case; genuine mismatches remain rejected.
- Added regression fixtures for both reported failures. Live content accuracy still requires source review.

### Phase 3 first integration — PDF practice quizzes

- Added PDF → academic setup → saved MCQ paper → existing timed attempt/results flow. School and university defaults share the existing optional Remember preferences.
- One bounded AI request produces up to five questions. Source/format checks omit invalid items with a visible notice; no automatic retry. Saved papers reuse content without inference.
- Migration 020 stores source/context/model provenance and generation keys, supports valid partial batches, and preserves paper/attempt history when source PDFs are deleted. Session creation now enforces quiz ownership.
- Verified real repository SQL with PGlite and mocked model/lock responses, including answer scoring and private access; inspected mocked browser mobile/desktop flows. TypeScript/build and flashcard regressions pass.
- Live PDF/model quality review remains pending. Web/PYQ research, verified source discovery, richer question formats and the remaining phases are still open.

### Phase 3 second integration — optional source discovery and review

- Added one explicit basic Tavily search using academic labels only, maximum five candidates, seven-day public metadata cache, monthly app-wide and daily student reservations. No Groq call is used for search or candidate validation.
- Candidates require student review and selection (maximum two). Persisted server-side source snapshots can guide phrasing/emphasis, while answers must still cite the PDF. Generated content is never labelled authentic PYQ or a guaranteed exam prediction.
- Added source links on saved quiz previews; raw answer evidence remains excluded. No-key, exhausted-allowance, provider-error and empty-result paths offer PDF-only practice.
- Migration 021 adds public candidate cache and search counters. Optional server-only TAVILY_API_KEY enables search; defaults are 500 basic searches/month for Aven and 5/day/student. No automatic retries or paid fallback.
- PGlite tests, mocked search-provider tests, quiz provenance/reuse regressions and mobile browser checks pass. Live Tavily/Groq matching and full-source authenticity verification remain pending; phase 3 is not complete.

### Paired delivery — flashcard draft review + helping-guide correction

- User requested larger and smaller tasks combined to reduce delivery overhead. Completed the first pair in one bundle, also including the preceding source-discovery commit for simpler installation.
- New PDF flashcards are durable private drafts, with source quotations/pages, editable fields and select-before-save. Resume does not call the model; commit is transactional and idempotent, with normalized duplicate checks and immutable source snapshots. Existing mastery/history remains unchanged.
- Helping/onboarding guide now matches workspace colors and editorial typography, uses a native accessible dialog, restores focus and supports mobile/reduced-motion operation. Removed outdated verified-bank count claims. This completes the guide correction within phase 6; Settings remains open.
- Migration 022 and real SQL/mocked-provider tests pass. Browser checks cover draft resumption, edit selection, failed-save retry, source display, all six guide steps and profile persistence. Screenshots inspected at phone/desktop sizes.
- Phase 4 preview/edit/selection and new-card source display are implemented. Existing-card editing, semantic near-duplicate detection and representative live quality review remain open. Phases 3/5/6/7 retain the previously documented unfinished work.
- Suggested next pair: useful Settings (larger) + question reporting (smaller). Password recovery still requires the reset-window decision and transactional-email setup before its final implementation.

### Paired delivery — Settings + student question reporting

- Replaced non-persisted Settings controls with saved profile fields, real account details, editable/forgettable academic defaults, active sessions, sign-out-other-sessions and private report history. Unavailable email/password and scheduling controls are labelled honestly.
- Completed quiz results now accept validated question reports. The server verifies ownership and completion, stores its own question snapshot and updates duplicate reports without changing scores. No model calls are made.
- Migration 023 adds the report table. API tests use real Express routes, authentication and PGlite SQL. Profile/default privacy, session revocation, report eligibility, duplicate updates and unchanged scores pass. TypeScript, production build, PDF quiz and flashcard draft regressions pass.
- Mocked-API browser checks cover phone/desktop layout, persisted reload, save failures/retries and report failures/retries. Live deployment and provider checks are not claimed.
- Admin review/correction, notifications and automatic question correction are not implemented. OTP recovery remains next, subject to email setup and the reset-policy decisions recorded above.

### Consolidated release batch — 26 October 2026

- User confirmed Settings/reporting worked and requested all remaining implementation together. They selected a rolling 30-day password-change window; no email provider was known. Code inspection found no existing recovery mail sender.
- Implemented OTP recovery and signed-in changes sharing two successful changes per 30 days, atomic writes/consumption/session revocation, independent throttles, best-effort notifications, and configurable Brevo/Resend adapters. Sending requires private operator configuration and a real inbox check.
- Implemented saved-card editing without altering history/source snapshots; wording-overlap review hints; allowlisted report desk with student-visible responses/audit events and precise optimistic versioning. No automatic score changes.
- Added PDF question count/difficulty/page scope with distinct cache keys and bounded single-call generation. Existing default paper keys remain compatible.
- Audited 554 seed questions across eight subjects, found no structural/option issues, identified absent source/context mappings, fixed Class/Grade normalization, and corrected obsolete UI claims. Production credentials were unavailable; no live records were reorganized. See curriculum-audit.md and release-completion-batch.md.
- Full-paper verification, live factual/token benchmarks, actual email delivery and approved production curriculum migration remain explicit release gates. Do not mark these complete based on mocked tests.

### Curriculum organization — batch 1 of the remaining three

- Added migration 025, school/university contexts, reviewed question placements and immutable paper provenance. Existing bank and history remain intact; no unverified initial mappings were fabricated.
- User-provided live audit matches seed totals (554 questions/eight subjects), with no structural/option issues. This does not prove answer accuracy or source authenticity.
- General practice retains profile filtering, including server-side topic filtering for All Topics counts and paper builds. Catalog publication is an operator-only CLI with validation-only default and explicit apply.
- Added a read-only bank export for the next content review. School/university collections remain empty until reviewed manifests are published.
- Catalog SQL/API, PDF quiz and Settings regressions, typecheck and production build pass. See curriculum-organization.md. Next: batch 2 sourced mappings/AI quality, then batch 3 deployed verification. No direct production changes were made here.

### Batch 2 — generation quality correction

- Fixed silent removal of extracted paragraphs longer than 1,500 characters. Long blocks now produce bounded windows while retaining source text/page provenance. The existing 6,000-character passage budget and six-passage cap remain unchanged; no additional model calls are introduced.
- Added deterministic checks for long paragraphs, source-preserving windows, page attribution, furniture removal, prompt budget and short mathematical evidence. These checks do not establish semantic answer correctness.
- Actual live-bank mappings remain pending the question-bank export. Full-paper authenticity and representative live model quality remain unverified. Batch 2 is not complete until these content reviews are performed; batch 3 deployed checks also remain.

### Live export received — focused first content publication

- Inventoried all 554 IDs and normalized question texts; no exact duplicates. Individually reviewed 18 introductory Physics entries; identified three wording/explanation defects and prepared guarded migration 026.
- Prepared a ten-question CBSE Class XI Physics starter manifest using the official 2026-27 syllabus. No PYQ authenticity or complete coverage claim. Publication is a separate explicit CLI step.
- Other 536 entries and university mappings still need individual review. See live-bank-review.md for exact scope and sources. No live database writes were performed here.

### Account deletion public usage and expanded content review

- Added password-confirmed account deletion, transactional cascade cleanup, durable uploaded-file retry queue and anonymous lifetime usage totals. Public landing page distinguishes registrations, accounts with successful AI responses and recent authenticated activity.
- Added migration 028 with 20 content corrections plus matching fresh-seed corrections. Screened inventory question/answer pairs; full independent answer and distractor certification is not claimed. See content-review-expanded.md for unresolved flags.
- SQL/API, browser and targeted regression checks completed locally. Production deletion and actual storage removal require a disposable-account acceptance test. Backups and provider logs retain their own lifecycle.
- Preparing owner handbook and editable presentation grounded in current source. No direct GitHub push or deployment performed.
