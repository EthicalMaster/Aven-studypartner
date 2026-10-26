# Aven owner guide

Source-grounded companion to the Word guide and presentation. Live configuration must be verified separately.


## What Aven actually does

Aven turns a student’s own material into a repeatable study workflow, with source references and saved progress.


### The student journey

A visitor reads the landing page, creates an account, uploads a PDF, waits for processing and then uses retrieval, summaries, quizzes or flashcards. Saved work lets the student return without regenerating everything.


### Your engineering contribution

You assembled the product workflow, persistence, access control, budget controls and interface around existing AI models. You did not train a new foundation model. Explain that distinction confidently rather than claiming an original LLM.


### Two question sources

General practice uses stored question-bank entries. PDF practice calls the generation pipeline using the uploaded document. A reviewed curriculum collection is a mapping of existing questions to a sourced syllabus, not proof that they appeared in an exam.


### The current scope

The supplied bank has 554 questions across eight subjects. A ten-question CBSE Class XI Physics starter was prepared separately. This delivery adds 20 guarded corrections. Screening the inventory does not certify every answer or every distractor.


**Example:** Explain Aven in 30 seconds: “I built a study platform that organizes uploaded PDFs, retrieves relevant passages and generates practice material with source checks. PostgreSQL stores student progress and vectors. A server-side AI gateway controls model calls and budgets.”


**Check yourself:** Can you explain the difference between building an AI product and training an AI model?


**Code:** src/components/landing/LandingPage.tsx; src/components/views; server/routes


## The system map

The browser handles interaction. The Node server controls access and coordinates the services.


### Frontend

React and TypeScript define the screens. Vite builds browser assets. Tailwind and CSS define layout and theme, while Motion supports transitions. Browser code never needs database passwords or provider API keys.


### Application server

Express routes receive HTTP requests. Middleware resolves the session, validators check the request, services execute the workflow and repositories run parameterized SQL. During development the same server uses Vite middleware. Production serves the built frontend.


### Persistence

Neon PostgreSQL holds identities, sessions, documents, extracted text, learning records and pgvector embeddings. Private Supabase Storage holds uploaded file bytes. These are different responsibilities even though both vendors also offer broader products.


### External computation

A long-lived Python process runs BGE embeddings. Groq supplies configured language-model inference. Tavily optionally discovers public exam-source links. Brevo or Resend sends recovery email. Render hosts the application according to your deployment configuration.


**Example:** A browser click can become: HTTP request, authenticated Express route, service call, database query, JSON response, React state update. A database URL is not a frontend API endpoint.


**Check yourself:** If an uploaded PDF is present in storage but missing from the library, which database record should you inspect?


**Code:** server.ts; server/routes; server/services; server/repositories; Dockerfile.onnx


## Identity and access control

The server decides whose records a request may use. A hidden button is never an authorization boundary.


### Registration

The backend normalizes email, validates input, hashes the password with Argon2id and creates the user and student profile. Password hashing is one-way verification, not reversible encryption.


### Session

A successful sign-in issues an opaque random token in an HTTP-only cookie. The database stores its hash. The browser sends the cookie on later requests. Production cookies use Secure and SameSite settings. Logout revokes the server session.


### Ownership

The authenticated profile ID scopes materials, retrieval, generated content and history. Routes should not trust a student ID supplied by the browser. Knowing another user’s document UUID must not grant access.


### Recovery

Email OTPs expire, limit guesses and use a server-secret HMAC. Sending a code does not consume the password-change allowance. A successful change counts toward the rolling limit of two per 30 days and revokes sessions.


**Example:** Authentication answers “who is this?” Authorization answers “may this account read that PDF?” An expired session fails the first check; a different owner fails the second.


**Check yourself:** Why is storing a session-token hash useful if the session table leaks?


**Code:** server/services/auth.service.ts; server/middleware/auth.middleware.ts; server/services/password-recovery.service.ts


## The PDF ingestion pipeline

Uploading bytes, extracting text and generating embeddings are separate stages with separate failure modes.


### Upload

The route checks authentication, content type, file size and account quotas. A storage adapter saves the file under an opaque key. A study_materials row records ownership, metadata and processing state.


### Extraction

The PDF parser extracts page text. The system stores document_pages, identifies sections and produces document_chunks with page ranges. Text PDFs work differently from scanned images. There is no general OCR guarantee: an image-only PDF can fail with no extractable text.


### Embedding

A bounded queue sends chunks to the Python BGE model and stores 384-dimensional vectors. The persistent Python process avoids loading the model for every chunk. The optional ONNX backend is intended to reduce host resource demand.


### Readiness

Text ready means extraction succeeded. Vector ready means embedding and vector persistence succeeded as well. A summary can use stored pages while semantic retrieval requires vectors. Read the actual processing state rather than assuming upload success means every stage is complete.


**Example:** For a 12-page laser PDF, the original file lives in private storage, text stays organized by page, chunks support retrieval, and each vector points back to its source chunk. The embedding is a numeric representation, not the original PDF.


**Check yourself:** Why might a document support summaries while semantic search is still unavailable?


**Code:** server/routes/material.routes.ts; server/services/document-intelligence; server/services/embedding


## Retrieval and grounded answers

Semantic search finds relevant stored text. The language model then receives a bounded amount of context.


### Query embedding

The same BGE model embeds the student’s query with the configured query instruction. Query and document vectors must have compatible dimensions and model semantics. Changing models can require re-embedding the documents.


### Vector search

The PostgreSQL repository compares vectors using cosine distance with mandatory student ownership filtering. A small top-k limits results. Current exact search is appropriate for modest personal collections; larger workloads may need measured indexing work.


### Canonical text

Retrieved vector hits are resolved back to canonical PostgreSQL chunks. Missing or stale hits are skipped. Returned metadata includes source pages and document identity, so the interface can show where context came from.


### Limits of grounding

Relevant evidence reduces unsupported generation but does not prove an answer is correct. Bad extraction, missing context, similar-but-wrong passages and model reasoning errors still matter. The model should not invent an answer when the document lacks evidence.


**Example:** “Why does the laser need population inversion?” can retrieve a passage even when the exact phrase differs. Cosine similarity ranks related numeric representations; it does not independently verify the physics.


**Check yourself:** What changes if you switch to an embedding model with 768 dimensions?


**Code:** server/services/retrieval/retrieval.service.ts; server/repositories/vector/postgres.repository.ts


## How generation becomes saved learning

Each learning feature has its own validation and persistence path. Not every feature uses retrieval in the same way.


### Summaries

The summary service builds bounded batches from stored pages. A source/model hash identifies reusable work. Leases prevent conflicting advances and saved partial results allow the workflow to resume. A large document may require several calls.


### PDF quizzes

The service selects meaningful passages, applies academic context and count/difficulty/page choices, calls the model and validates individual items. It checks four distinct options, valid answer index, source identity and matching evidence. Invalid items are rejected rather than blindly saved.


### Flashcards

Generated cards enter a private review draft. The student can edit, select and save cards. Saving selected cards is transactional and designed to resist duplicate submissions. Evidence snapshots remain attached. Existing-card edits preserve review history.


### Evidence and quality

Exact evidence matching preserves mathematical signs and case. Short formulas can be legitimate evidence. Long PDF blocks now become bounded windows rather than disappearing. However, matching a quote cannot prove that a question, explanation or marked answer follows logically from it.


**Example:** A model returns six cards. One has an invented quote and one duplicates another question. The validator can reject those while allowing useful cards into review. Reopening a saved draft should not spend another generation request.


**Check yourself:** What is the difference between JSON schema validity, source validity and factual validity?


**Code:** server/services/summaries; server/services/pdf-quiz.service.ts; server/services/learning-content; server/services/flashcard-draft.service.ts


## AI budgets and provider boundaries

Aven controls its own usage before sending a request, but provider quotas remain a separate limit.


### Gateway

The AI gateway validates input, applies per-account and global concurrency limits, checks request allowances and calls the selected provider adapter. Model name and provider come from server configuration, so the deployed model must be checked there rather than guessed from old screenshots.


### Token reservation

Before a call, the app reserves a conservative amount against a database-backed daily token budget. Known actual usage settles the reservation. Unknown usage after a failed request keeps the reservation to avoid assuming the provider charged nothing.


### Practical controls

Input limits, output caps, bounded passages, cache reuse and limited search candidates reduce waste. The user-reported AI_MAX_OUTPUT_TOKENS value is 4500; the example file has a lower default. Raising an output cap permits longer outputs but does not create more provider quota.


### Cost and reliability

No automatic paid fallback is implied. Two API keys do not automatically double a shared provider account allowance. Treat model availability, latency, quotas and output quality as things to measure. A timeout may still have consumed provider resources.


**Example:** A “daily limit” message may come from Aven’s request limit, the shared token reservation or Groq’s own rate limit. The error code and server logs tell you which layer refused the request.


**Check yourself:** Why keep a token reservation when the provider times out without reporting usage?


**Code:** server/services/ai/gateway.service.ts; server/services/ai/token-budget.ts; server/services/governance/quota.config.ts; .env.example


## Quizzes flashcards and progress

Saved answers and review events turn a one-time generation into an ongoing study system.


### Quiz lifecycle

A quiz contains copied questions. A session tracks question order, timing and submitted answers. Scoring runs on the server and results persist separately. Active-paper responses should not reveal answer keys. Updating the bank does not rewrite a previously copied paper.


### Flashcard scheduling

Aven uses an SM-2-style scheduling implementation. Recall ratings influence repetition count, ease and next review interval. This implementation has its own Again/Hard/Good/Easy timings, so describe it as an adaptation rather than claiming exact equivalence to every flashcard app.


### Adaptive analytics

Quiz results, study sessions and review events feed subject/topic mastery and activity summaries. These are useful product indicators, not clinical or psychometric measurements of intelligence or mastery.


### Reporting

Students can report questions from completed owned sessions. An allowlisted reviewer can respond with an audit history. The system does not automatically rewrite historical scores after a question report. This preserves traceability but means corrections need explicit policy decisions.


**Example:** A wrong answer discovered today can be corrected for future papers. A quiz taken yesterday retains its original question snapshot and score so the record does not silently change.


**Check yourself:** Why separate a reusable question bank from questions copied into a specific quiz?


**Code:** server/services/scoring.service.ts; server/services/flashcard.service.ts; server/services/adaptive-model.service.ts; server/services/question-report.service.ts


## Curricula and public exam sources

A syllabus mapping and a genuine past-paper claim require different evidence.


### Academic context

Brief school/university details guide language and complexity. Saved defaults can reduce repeated typing, but the student still confirms context for a document. A school name alone is not a curriculum specification.


### Reviewed catalog

Contexts record authority, program, stage, version and source. Placements link existing question IDs to that context. The operator CLI validates a manifest by default; an explicit apply publishes it. Existing question IDs and study history are preserved.


### Optional web discovery

Tavily receives academic labels, not the private PDF text. Search candidates are cached and the student can select a limited number. Search summaries can guide phrasing only when consistent with the PDF. They are not independent answer evidence.


### Honest coverage

A discovered URL is not a verified exam paper. School assessments may not be public, and university sources can be mismatched or old. Full-paper authenticity, complete university coverage and guaranteed exam prediction are not delivered claims. The current catalog is deliberately small.


**Example:** An RGPV syllabus can establish that a topic belongs to a course. It does not establish that a newly generated MCQ appeared in a previous RGPV exam.


**Check yourself:** Which evidence would justify calling a question an authentic PYQ?


**Code:** shared/academic-context.ts; server/services/curriculum-catalog.service.ts; server/services/exam-research; server/db/catalog


## Deletion and public usage numbers

Personal records can disappear while non-identifying cumulative counts remain.


### Deletion request

Settings requires the current password and typed DELETE. The authenticated endpoint locks the account and profile, removes restrictive dependencies and deletes the user in a transaction. Cascades remove learning data, sessions, document text and vectors. The browser then reloads the public site.


### Uploaded files

The database cannot atomically delete an object in another service. A trigger records opaque file keys in a durable removal queue before material rows vanish. The worker retries failed removal. Its queue keys disappear after successful cleanup. Sleeping hosts delay this work until awake.


### Public totals

Registered accounts start from surviving profiles at rollout and increase thereafter. Accounts with an AI response count the first successful provider response observed after rollout. Recent activity counts existing users with a session seen within 30 days. These are not unique humans, live visitor counts or proven learning outcomes.


### Privacy boundary

Identity-linked AI markers are deleted, but anonymous lifetime totals stay. Existing backups and provider logs have separate retention. Already returned browser data and in-flight computation cannot be recalled. Restoring old backups requires operational care to avoid restoring deleted data.


**Example:** Twelve registered accounts become eleven current accounts after one deletion. The public cumulative registration total remains twelve. The deleted account’s PDF key stays in the temporary cleanup queue only until removal succeeds.


**Check yourself:** Why is a durable cleanup queue safer than deleting a database row and hoping file removal succeeds?


**Code:** server/services/account-deletion.service.ts; server/services/public-usage.service.ts; migrations 027; src/components/settings/DeleteAccount.tsx


## Development deployment and debugging

Code, database schema and environment configuration are separate parts of a release.


### Local workflow

Install locked dependencies with npm ci. Configure server-only .env values, migrate the database and run npm run dev. Build uses Vite for the client and esbuild for the Node server. npm start runs the production bundle. Python dependencies and model files are separate from npm packages.


### Hosting connections

Render runs the application. DATABASE_URL selects PostgreSQL, while Supabase settings select file storage. The ONNX Dockerfile includes the Python environment and cached model. The exact deployed Dockerfile and environment must be checked in Render, not inferred from the repository alone.


### Release discipline

Test on a preview branch, apply compatible migrations, inspect the app, merge into fix/neon-retrieval and push. A Git push does not itself publish curriculum manifests. A local migration changes whichever database the local DATABASE_URL selects; it may already be production.


### Debugging order

Read the error code and identify the failing layer: browser, HTTP route, database, storage, embedding process or provider. A successful build proves compilation, not live connectivity. Preserve backups before schema/data work and never solve an error by reseeding production.


**Example:** If the site loads but says PostgreSQL timed out, rebuilding the React page will not repair database connectivity. Check the server database URL, reachability and connection settings first.


**Check yourself:** How can a locally run migration affect the live website?


**Code:** package.json; server.ts; server/db/migrate.ts; server/db/connection.ts; Dockerfile.onnx; .env.example


## Maintaining Aven without this chat

A useful handoff states the behavior, evidence, affected files and validation requirements.


### Describe a concrete change

Tell the next developer or AI what the student does, what happens now and what should happen instead. Include the error code, a minimal reproduction and the relevant code files. Do not provide API keys, passwords or a production database dump with personal records.


### Protect the invariants

Preserve ownership checks, private storage, quota reservations, exact evidence matching and historical quiz snapshots. Require additive or guarded migrations, meaningful tests and no automatic deployment. A request to “make it better” is less useful than a reproducible acceptance test.


### Know what tests prove

PGlite checks actual PostgreSQL-style SQL locally. Mock providers exercise failure paths without spending tokens. Browser checks test interaction and layout. Only a live disposable-account test confirms actual mail, storage, model and deployment configuration together.


### Your next engineering skills

Trace one request through route, service and repository. Run an isolated test. Change one UI label and verify it. Inspect one SQL foreign key. Explain one failure case. These small exercises build practical ownership more reliably than memorizing a technology list.


**Example:** Handoff: “In Aven, PDF quiz generation rejects every item for changed evidence. Inspect learning-content/quizzes.ts and pdf-quiz.service.ts. Preserve case-sensitive math matching, ownership and budgets. Add a regression fixture, run PDF quiz tests, lint and build. Return a reviewable diff and migration notes; do not push.”


**Check yourself:** Can you trace a PDF quiz request through the code without asking an AI where everything is?


**Code:** docs/aven-next-phase-plan.md; docs/account-deletion-and-usage.md; server/test; docs/content-review-expanded.md


## Interview questions


### Did you build the AI model?

No. I integrated existing inference and embedding models into a study workflow, with persistence, access control and validation. I can explain and modify those integration layers.


### Why PostgreSQL and pgvector?

The same database can hold relational ownership and searchable vectors, reducing operational services. Exact vector search is simple for modest collections. Scaling decisions need query measurements.


### Why keep Supabase and Neon?

In this deployment Neon stores application records, while Supabase stores private uploaded files through a dedicated storage account. Supabase Auth is used for that server storage account, not as Aven’s student login system.


### Is this RAG?

The retrieval-assisted answer path retrieves owned document passages before generation. Summaries and PDF practice also use stored source text, but may select pages directly rather than perform semantic search.


### Can the AI hallucinate?

Yes. Schema and quotation checks reduce some errors, but cannot prove semantic correctness. Review drafts, reports, benchmarks and honest source labels are part of the response to that limitation.


### How do you prevent one student reading another PDF?

Resolve the authenticated session on the server, derive the profile ID there, and apply ownership filters in routes and repository queries. Never authorize from a browser-supplied ID alone.


### What happens when the AI quota runs out?

New calls fail with a controlled allowance error. Saved work remains available. Aven’s budgets and the provider’s rate limits are independent constraints.


### What happens when a user deletes an account?

The transaction removes linked database records and sessions. A durable queue removes original files with retries. Anonymous lifetime totals remain. Backup and provider retention are separate operational responsibilities.


### Are the homepage numbers proof that users learned?

No. They measure registered accounts, accounts with successful provider responses after rollout and recent signed-in activity. The labels deliberately avoid claiming verified learning outcomes.


### Are your questions real PYQs?

The stored and generated practice questions are not automatically authentic PYQs. Syllabus alignment and search candidates are clearly distinguished from verified original exam papers.


### How would you scale this?

Measure latency, memory and database queries first. Likely work includes durable background workers, distributed concurrency control, appropriate vector indexing, connection pooling and stronger monitoring. These are future design choices, not current guarantees.


### What is your biggest technical limitation?

Generation quality and source coverage still need ongoing evaluation. Small-host resources, provider availability, scanned PDFs without OCR and in-process worker behavior also limit reliability.


### What does a passing build prove?

The frontend and backend can compile. It does not prove that Render has the right secrets or that a real PDF, email and AI request work end to end.


### What did AI help you do?

AI helped implement and review code. My responsibility is to understand the flow, verify behavior, explain tradeoffs and avoid claiming skills or validation I have not demonstrated.
