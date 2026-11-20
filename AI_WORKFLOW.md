# AI Workflow Note

> **Draft. Edit before submitting** so it reflects your own process and the tools you actually used. The items below are real events from building this codebase.

## Tools used

- **Claude (Anthropic), agentic coding session:** scaffolding, implementation, tests, a headless-browser smoke test, and first drafts of the docs.
- `<add any others you used, e.g. Cursor / Copilot / ChatGPT>`

## Where AI materially sped things up

- **Boilerplate across the stack:** route handlers, Zod schemas, the SQLite schema and seed, and CSS. This is roughly the first two hours of a by-hand build.
- **Library API recall for current versions:** Next.js 16 async `params` and `cookies()`, TipTap 3 (Underline now in StarterKit, `useEditorState`, `immediatelyRender: false` for SSR), and the mammoth style-map syntax.
- **Test scaffolding:** generating a real `.docx` inside the test with the `docx` package, instead of committing a binary fixture.

## What I changed or rejected

- **Caught a real save bug during verification.** The first browser test reloaded the page while an autosave was still inside its 800 ms debounce, and the content was lost. The test had waited on the initial "Saved" label, which was a false positive. I fixed the test to wait for a real save, and added a `pagehide` handler that flushes pending edits with `fetch(..., { keepalive: true })` so closing or reloading the tab doesn't drop the last keystrokes. The browser test now checks this case.
- **Rejected storing editor JSON.** HTML plus a server-side allow-list fit the import path and future export better, and it closes the stored-XSS hole if a client bypasses the editor. See ARCHITECTURE.md §1.
- **Rejected a plain `userId` cookie** for mocked auth and required an HMAC signature, so users can't impersonate each other by editing the cookie. A test covers this.
- **Rejected last-write-wins** for saves and added the `baseUpdatedAt` version check (409), with a test.
- **Fixed silent data loss in .docx import:** mammoth drops underline by default, so I added a `u => u` style map and a test that asserts underline survives.
- **Viewer UX:** the editor showed "Saved · time" to read-only users. I changed it to "Last edited · time".
- **Avoided scope creep:** declined to add real-time presence and version history mid-build, and documented them as next steps instead.

## How I verified correctness

- **Unit and integration tests (Vitest, 16 tests)** on the permission matrix, sharing lifecycle, sanitization, the conflict check, all three import formats, and cookie tampering. They run against an in-memory SQLite database.
- **API checks with `curl` against the production build:** unauthenticated 401, forged cookie 401, outsider 404, viewer write 403, empty title 400, bad email 400, unsupported upload 400, and Markdown import 201.
- **Headless-browser run (Playwright + Chrome)** of the full flow: log in, create, format with toolbar and shortcuts, reload and confirm the HTML structure survived, share as viewer, sign in as the second user, confirm no toolbar and `contenteditable=false`. It also asserts no console errors. Screenshots are in `docs/screenshots/`.
- **Type check** (`tsc --noEmit`) and `next build` are clean.
- **Manual visual review** of every screen from the screenshots: layout, empty states and role badges.
