# Curriculum audit and proposed mapping

26 October 2026. Scope: repository schema, seeds and filtering code. No live database credentials were available. `curriculum-audit.json` contains the reproducible seed inventory; this is not a production-data or factual-answer certification.

## Findings

554 questions, eight subjects: Biology 72, Chemistry 72, Computer Science 72, Data Science 70, English 60, General Aptitude 64, Mathematics 72, Physics 72. Structural validation and duplicate option checks found no errors. This does not establish that every answer is correct or that a syllabus is covered.

The question bank stores subject/topic/answer information but lacks exam authority, class/semester, curriculum version, source URL/year and review provenance. The existing eligibility rules infer groups from profile labels, rather than using verified institution-specific mappings. There is not enough evidence to reclassify all questions as CBSE, RGPV, IITM or another curriculum. General practice content must remain labelled accordingly.

A concrete filtering defect was fixed: `Class 10` now uses the same rule as `Grade 10` (also covered for grades 5 and 12). This does not make the underlying topic lists official syllabi. Outdated UI claims about a standardized university syllabus and unavailable PDF generation were corrected.

The seed command has a destructive `--reset` mode that truncates the question bank with CASCADE. Do not use that for this release. No question-bank rows, IDs, results or flashcard reviews were rewritten.

## Proposed model, pending live audit and sourced mapping

- School: exam authority/board → curriculum version → class → subject → unit/topic.
- University: awarding authority → program → curriculum version → year/semester → subject → unit/topic. College affiliation is separate from the awarding authority.
- Keep question content separate from many-to-many curriculum placements. Preserve existing IDs and copied historical quiz questions.
- Record provenance category (general practice / sourced PYQ / private AI practice), source URL/year, reviewer and review status. Unreviewed records are not verified material.
- Quarantine suspect entries for review; do not delete or silently rewrite attempted papers.

## Read-only production audit

With the correct DATABASE_URL configured locally:

```powershell
npm run audit:curriculum -- --live --output curriculum-audit-live.json
```

Uses a READ ONLY transaction and 15-second statement timeout; reads at most 10,000 bank questions, reports truncation explicitly, and records history counts without reading student identities. It writes only the local report file. Review that report alongside official curricula before designing a production migration. The report can include question text in validation findings; review it before sharing publicly.
