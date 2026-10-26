# Curriculum organization — batch 1

Migration 025 adds reviewed curriculum contexts and question placements, plus a saved context snapshot on new papers. It does not rewrite the existing bank, quiz results or flashcard reviews. General practice retains profile filtering. School/university collections display only published mappings; initially they are empty. This is intentional, not a missing seed operation.

The supplied live audit counted 554 questions across eight subjects, nine quiz results and 44 flashcard reviews, with no structural/option issues reported. That audit does not establish factual correctness, official provenance or syllabus coverage. No production database was accessed during implementation.

## Operator workflow

1. Run `npm run db:migrate` against the intended database. Do not reseed or reset the bank.
2. Run `npm run curriculum:export` to export bank question IDs/content to curriculum-bank-export.json for review. It excludes student identities and study history. Keep the export out of Git.
3. Review actual questions against a dated authoritative syllabus. Prepare a manifest with level (school/university), authority, program (required for university), stage, curriculumVersion, sourceUrl (HTTPS), reviewNote (at least ten characters), reviewedBy, and placements. Each placement has questionId, unit, sourceUrl and reviewNote. IDs must exist and be unique within the manifest. Do not claim generated practice questions are authentic PYQs.
4. Run `npm run curriculum:publish -- reviewed-manifest.json`. Default is validation only; no publication writes occur. HTTPS validation checks URL syntax, not source authenticity.
5. After reviewing the manifest, run `npm run curriculum:publish -- reviewed-manifest.json --apply`. Save the returned context ID. Updating a context requires that explicit `id` in the manifest and replaces its placements transactionally. No question text or historical paper is changed. Duplicate context identities fail rather than silently overwrite.
6. Check catalog selection, subject/topic counts, paper generation and the saved source label. Previously saved context snapshots remain unchanged if mappings later change.

No new environment variables or model calls are introduced. Migration must run before the new deployment serves catalog requests. The exporter is read-only but has not been exercised against the live database here.

## Verification

TypeScript, production build, curriculum catalog SQL/API tests, PDF quiz regressions and Settings/report regressions pass. Catalog tests use PGlite and Express, not production credentials. They cover dry-run isolation, invalid IDs, scoped counts/build, authentication, ownership, hidden answer keys, withdrawn contexts, and preserved bank/history. Production/provider checks remain for batch 3.

## Remaining batches

Batch 2: use the exported live IDs/content for a limited reviewed curriculum mapping, verify exam sources, and assess representative AI output within token budgets. Broad school/university coverage is ongoing content work, not implied by the catalog.

Batch 3: exercise deployed signup/login/recovery, PDF upload/retrieval/generation, saved history, mobile flows and failure paths; fix observed blockers and record remaining limitations.

Mocked-API browser checks passed for collection switching, unpublished-collection empty states, scoped metadata, source links, mobile overflow and runtime errors. Mobile layout was visually inspected. These are not live deployment checks.
