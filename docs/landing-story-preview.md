# Landing story — revised preview

## What changed

The public page uses one coordinated desktop scene: the note settles into a source
panel, a connected explanation appears, then practice replaces the explanation.
The paper moves in one direction during forward scrolling and reverses directly
with backward scrolling. Reading holds separate transitions. There is no scroll
interception, delayed spring, looping ornament, or autoplaying background.

Instrument Serif (normal/italic) and DM Sans (regular/medium) are locally bundled
with their OFL licenses in public/fonts. Typography, alignment, chapter indicators,
and source/answer geometry share the same layout grid. Unrelated spheres, orbital
rings, the paper-overlapping caption, and animated water have been removed.

Small screens, short windows, and reduced-motion preferences receive a linear
reading flow. Demo content remains visible even before an entrance transition.
Inactive desktop chapter controls are inert and excluded from the accessibility
tree. The source highlight and quiz are illustrative local interactions; they do
not generate AI answers or save progress.

## Verification performed

Tested using headless Chromium with local Vite and mocked unauthenticated API
responses. No real user accounts, documents, production databases, or AI providers
were used. Screenshots were visually inspected, not only generated.

- TypeScript and production build: passed.
- Screenshots: desktop hero, eight scroll positions, intermediate laptop layout,
  interactive source view, quiz, phone/tablet layouts, reduced-motion page.
- Desktop motion: 11 sampled positions at 1440×900, 1024×768, and 1920×1080.
  Paper movement was monotonic, source/answer/practice stayed within the viewport
  and clear of navigation/footer, and answer/quiz text never overlapped.
- Reverse scrolling returns to the original hero state.
- No horizontal overflow at 320, 390, 768, or 1024 pixels wide.
- Short-window fallback checked at 1200×600; reduced-motion view shows all chapters.
- Locally served editorial and body fonts loaded successfully.
- Source highlight on/off, incorrect/correct quiz answers, and reset: passed.
- Get started opens registration; Log in opens login; Back to Aven and browser
  back navigation work. No credentials were submitted.
- Skip link/keyboard focus checks passed; inactive chapters cannot receive focus.
- No JavaScript exceptions during the checks.

Visual verification caught and fixed an overlapping paper caption and invisible
mobile demo panels. Existing Vite configuration and chunk-size warnings remain.
These checks cover Chromium and sampled sizes, not every device or a hardware
frame-rate guarantee. Existing authenticated app styling is unchanged.

## Local review

Fetch the revised bundle, create or update a preview branch, and run npm run dev.
No dependency installation, migration, or environment change is required for the
revision. Root shows the public page; #login, #signup and #workspace enter the app.
Do not merge into the deployment branch until the design is accepted.
