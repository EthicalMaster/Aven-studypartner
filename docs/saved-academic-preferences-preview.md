# Saved academic generation preferences

Optional account-scoped defaults for board/university, class/year/semester and program. Subject remains document-specific. The form loads saved defaults and asks the student to confirm them; it does not automatically generate or overwrite the main profile. Remember saves on confirmation; unchecking Remember makes this attempt one-off but leaves previous saved preferences intact. Forget explicitly deletes stored preferences. No additional model calls are made.

Authenticated GET/PUT/DELETE `/api/auth/academic-preferences` derives student identity exclusively from the session. Strict shared validation rejects unexpected fields. Migration 019 creates a separate table with profile-deletion cascade. All paths support school/university labels and Unknown authority.

Saved-preference load failures leave manual entry available. Save failures stop generation and explain how to retry or uncheck Remember. Existing deck reuse is unchanged. This does not yet add PDF quizzes or web/PYQ research.

## Preview

Start from the deployed short-evidence fix f74e75c with clean tracked work. Save the bundle in Downloads.

```powershell
git switch fix/neon-retrieval
git bundle verify "$HOME\Downloads\aven-saved-academic-preferences.bundle"
git fetch "$HOME\Downloads\aven-saved-academic-preferences.bundle" feat/saved-academic-preferences
git switch -c preview/saved-academic-preferences
git merge FETCH_HEAD
npm run db:migrate
node --import tsx server/test/academic-preferences.test.ts
npm run lint
npm run build
npm run dev
```

Migration 019 runs against your configured DATABASE_URL; if this points at the live Neon database, the new table is created there too. No environment changes. Before deployment, migration 019 must exist on the deployment database.

Test a new document: select Remember and generate. Open generation on another new document: academic details should be prefilled while the new document's subject remains its own. Edit or forget defaults. Another signed-in student must not see these preferences. Existing decks skip generation setup and preserve review history.

Tests: temporary PGlite database verifies defaults, ownership isolation, invalid input, subject exclusion, path replacement, explicit deletion and profile-deletion cascade. TypeScript and production build pass. Live Groq quality is unaffected and was not retested.

Chromium isolated-component checks with mocked APIs passed: saved defaults, document subject retained, school/university submission, persistence requests, explicit forget, mobile overflow and Escape. The mobile screenshot was visually reviewed.
