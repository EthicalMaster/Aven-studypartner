# Optional syllabus / past-paper source discovery

Base: 4decf38 (PDF quizzes). Branch: feat/exam-source-discovery.

## What this delivery does

In Quizzes → Quiz from PDF, opt into “Find syllabus / past-paper sources”. Confirm academic details, review up to five candidate links, and select up to two after checking institution/board, program, subject, semester and curriculum/paper year. You can always choose PDF-only practice instead.

Only explicit academic labels are sent to Tavily. The private PDF, its title and account identity are not included in the search request. Results are shared public metadata cached for seven days by academic context. No Groq call is made for source discovery. Both university and school-board searches are supported; school-specific paper availability is not assumed.

This is a discovery and human-review step, not independent verification of full papers. Search summaries may be incomplete, outdated or third-party. No result is labelled official/verified just because its domain looks educational. The selected candidate summaries can inform question wording/emphasis only when consistent with the PDF; answer evidence must still match the PDF. It does not claim exam frequency, guaranteed appearance or authentic PYQ status.

Candidates are selected by server-issued IDs; the server rejects modified context, arbitrary source IDs, missing review confirmation and expired results. Up to two source snapshots are retained with the quiz. Safe source links appear on the saved paper preview, without exposing answer evidence. Existing PDF-only cache keys are preserved. Selecting different source content creates a distinct paper; repeated identical selection reuses it. Reopen saved papers directly from the quiz list even after search cache expiry.

## Setup

1. Apply the bundle on a preview branch and run `npm run db:migrate`. Migration 021 creates public-source cache, monthly reservation and student daily reservation tables.
2. Create a free Tavily account at https://app.tavily.com and obtain a key. Keep it private; put it in local `.env` as `TAVILY_API_KEY=...`. Do not use a VITE_ prefix or commit `.env`.
3. Recommended defaults: `EXAM_SEARCH_MONTHLY_LIMIT=500`, `EXAM_SEARCH_DAILY_LIMIT=5`. Restart `npm run dev`. No new package installation is needed.
4. For deployment, set the same server-only variables in Render. If local and Render use the same Neon database, migrate once. Otherwise migrate the intended target before deployment. Do not run seeds.

Tavily's official docs, checked 26 October 2026, advertise 1,000 free credits/month without a credit card, with one credit per basic search. Keep the account on the free plan with pay-as-you-go disabled. Aven makes a single `basic` request with `auto_parameters=false`; no raw-page extraction, generated search answer, crawl or retry. Allowances cover this Aven database, not other projects sharing the provider account. The code's maximum monthly setting is 900; defaults leave headroom. Failed/unknown provider requests retain their reservation conservatively.

Missing key, exhausted allowance, empty results or search failure does not block PDF-only generation. Database failures fail closed for search. Cached candidates do not consume search allowance. AI generation still uses the existing separate Groq limits; raising search allowance does not raise AI allowance.

## Verification and limitations

Passed TypeScript/build, `npm run test:exam-research`, `npm run test:pdf-quizzes` and academic-context regression. PGlite exercises actual reservation/cache SQL; external search and advisory locks are mocked. Tests cover absent key, cache reuse across students, strict selection/context validation, expiry, invalid links, bounded response, budget rollback, retained reservations on failure and no automatic retry. Quiz tests verify source snapshots reach the prompt and persist without changing PDF evidence or saved-paper reuse.

Mocked mobile browser checks cover opt-in, saved university details, explicit review gate, source links on preview and unavailable-search PDF-only fallback. Screenshot: exam-source-review-mobile.png. Existing Vite config and large-chunk warnings remain.

Live Tavily and Groq calls were not made here. Before pushing, test a known university/subject, inspect actual returned sources and check the generated quiz against the PDF. Do not count this as completed authenticity verification. Full document fetching/extraction, verified institution/version matching, topic mismatch detection, authentic PYQ ingestion and question reporting remain in phase 3.

Rollback: return to the prior application commit and leave migration 021 applied. Tables are additive and do not rewrite question banks or attempts. Clear the key to disable new searches without removing saved papers or their source links.

Official references:
- https://docs.tavily.com/documentation/api-credits
- https://docs.tavily.com/documentation/api-reference/endpoint/search
