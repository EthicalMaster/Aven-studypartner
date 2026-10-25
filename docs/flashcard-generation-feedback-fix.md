# Flashcard generation feedback fix

Confirmed UI defect: errors were only placed in a top-of-page notification that disappeared after five seconds. A student viewing a document lower down could see generation stop without any explanation.

This patch keeps the server error and error code beside the affected document until the next attempt. It preserves AI gateway status codes (including budget, provider and validation errors). Successful requests open the returned saved cards directly rather than depending on a dashboard refresh to show a Study Deck button. Empty success responses are treated as failures. Other generation buttons are disabled while a request runs.

The specific cause of the user's failed provider/database request is not known without its error response. This patch does not claim to fix an unobserved quota, database or inference failure. It exposes that failure reliably so it can be corrected without guessing or spending tokens on repeated attempts.

No migrations, dependency updates or environment changes. Based on academic setup f7176d8.

```powershell
git fetch "$HOME\Downloads\aven-flashcard-generation-feedback.bundle" fix/flashcard-generation-feedback
git switch -c preview/flashcard-generation-feedback
git merge FETCH_HEAD
npm run dev
```

Apply from the branch containing the academic setup, even if that setup has not been pushed yet. Try generation once. If a red message appears beside the document, copy its full text and code; never share API keys or the .env file.

Validation: TypeScript and production build pass; academic-context service tests pass. Chromium component integration test with mocked endpoints confirms a quota error remains visible beyond five seconds and a subsequent successful response opens the returned flashcard. No live Groq request was made.
