# Short flashcard evidence validation fix

The reported error was `flashcards.3.evidence: Too small: expected string to have >=30 characters`. The fourth card's evidence failed an arbitrary length minimum, rejecting the whole batch before saving.

Evidence now accepts a non-empty, trimmed quote up to 800 characters. The supporting text must still match the identified source passage. Empty/whitespace evidence, invented quotes, wrong source IDs and oversized evidence remain invalid. The prompt now requests the complete supporting statement or formula with necessary context, without padding to reach a minimum length. Matching a quote does not by itself prove that the answer is factually supported.

Tests passed for short formula evidence, invalid evidence, existing passage-selection checks and academic-context generation. TypeScript and production build passed. No live model request was made; retry the affected chemistry material once after installing. No database migration, environment change or re-upload is required.

From your branch containing the previous feedback fix (e2e1a39), with clean tracked work:

```powershell
git fetch "$HOME\Downloads\aven-short-flashcard-evidence.bundle" fix/short-flashcard-evidence
git switch -c preview/short-flashcard-evidence
git merge FETCH_HEAD
npm run dev
```

If generation fails again, copy the persistent error message. Existing saved decks are unchanged. Do not publish until the affected document has been retested.
