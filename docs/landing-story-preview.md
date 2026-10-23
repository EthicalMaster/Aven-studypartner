# Landing story preview

A public introduction now appears at the root before authentication. Hash routes
`#login`, `#signup`, and `#workspace` enter the existing authenticated app. Section
anchors remain on the public page. Signed-in visitors can choose My workspace.

The new landing page uses warm ivory, navy and blue, system Georgia headings,
and existing Inter body text. The document and answer scene uses Motion's
scroll progress with a sticky desktop stage. Mobile and reduced-motion layouts
use a linear reading flow. Source highlighting and quiz feedback are local,
deterministic demonstrations and do not call an AI provider or save quiz results.
The page explicitly identifies the planned tutor as a concept preview.

## Scope

Included: landing story, sample source interaction, sample quiz, entry navigation,
and accurate public metadata. No database, environment, provider, or storage changes.
The signed-in dashboard and authentication styling are still the previous design;
the complete visual-system rollout follows review of this prototype.

## Validation

TypeScript and production build passed. Existing Vite configuration and chunk-size
warnings remain. Browser execution was attempted but the browser download failed;
visual layout, scrolling and runtime interactions still require a local review.

Before publishing, check:

- Root opens the landing page while logged out.
- Scroll the full desktop story: document stays visible, rotation and line drawing
  follow scrolling, text remains readable, no section traps the scroll.
- Source button highlights and clears the passage; quiz gives correct feedback
  for each selection; Try again resets it.
- Get started opens registration; Log in opens login; Back to Aven returns home.
- Browser back/forward works across landing and authentication.
- Sign in with an existing account and confirm the dashboard still works.
- At 390px width there is no horizontal overflow and controls remain usable.
- With reduced motion enabled, the story is static and fully readable.
- Tab through navigation, source toggle, radio choices and calls to action.

Keep this on a preview branch until reviewed. No migration is required.
