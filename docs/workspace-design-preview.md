# Aven workspace design preview

The signed-in workspace and sign-in/register screens now share the landing page's ivory, navy and sage palette, Instrument Serif headings and DM Sans body text. Shared CSS tokens cover the dashboard, library, flashcards, quizzes, progress, insights and settings. The navigation, account menu and notifications have been restyled; mobile navigation includes Escape dismissal, focus management and a focus trap. View transitions respect reduced-motion preferences. Fonts and Material Symbols are served locally.

The unused global search field has been removed; library search remains. Upload guidance no longer describes obsolete development phases. A real zero retention score is no longer replaced by a fictional 75% fallback.

No dependencies, environment variables, database migrations, retrieval services or AI providers change in this preview.

## Verification

- `npm run lint`: passed (TypeScript).
- `npm run build`: passed. Existing Vite config-loader and bundle-size warnings remain.
- Chromium UI smoke checks with mocked API responses: sign-in rendering, navigation through all nine views, upload dialog, 320/390/768px overview widths, mobile drawer/Escape, reduced motion and no uncaught browser exceptions.
- Screenshots in `docs/workspace-review` were visually inspected. They contain fictional sample data. Some views were checked with service-unavailable responses; this does not verify their live backend.
- Earlier responsive checks also covered the library at 320px and all main views at phone width.

Before publishing, locally sign in with your account, open existing notes, run a retrieval query, upload a small PDF and complete a practice action. Real authentication, uploads, generation and database writes are not exercised by the isolated UI checks.

## Preview on Windows

Save the bundle in Downloads. Start with a clean tracked working tree on `fix/neon-retrieval`, containing the previous refined landing changes (base dd33b9e). Untracked `uploads/` should stay local.

```powershell
git switch fix/neon-retrieval
git bundle verify "$HOME\Downloads\aven-workspace-design.bundle"
git fetch "$HOME\Downloads\aven-workspace-design.bundle" feat/workspace-design
git switch -c preview/workspace-design
git merge FETCH_HEAD
npm run dev
```

Open http://localhost:3000 and enter the workspace. This creates a local preview branch and does not publish anything. To return to the previous version, stop the server and switch back to `fix/neon-retrieval`.
