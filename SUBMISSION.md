# Submission: Ajaia Docs

| Item | Location |
|---|---|
| Live product URL | `<ADD DEPLOYED URL>` |
| Walkthrough video | `VIDEO_URL.txt` |
| Source code | This folder (`app/`, `components/`, `lib/`, `tests/`) |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| Screenshots | `docs/screenshots/` (login, dashboard, editor, share dialog, second user's dashboard, view-only editor) |
| Automated tests | `tests/` (Vitest, `npm test`) and `scripts/e2e-smoke.py` (optional Playwright) |
| Deployment config | `Dockerfile`, `render.yaml`, `.env.example` |

## Test accounts

No passwords. Choose a user on the login screen.

- `alice@ajaia.test` owns "Q4 Planning Notes" (shared with Bob as editor) and can view Bob's "Vendor Brief".
- `bob@ajaia.test` owns "Vendor Brief" and can edit Alice's notes.
- `carol@ajaia.test` has no documents. Share something with her.

Use two browsers, or a private window, to act as two users at once.

## Status

**Working end to end:** create, rename, edit with rich text (bold, italic, underline, strikethrough, H1–H3, both list types, quote), autosave and reopen, import of .txt, .md and .docx into a new document, owner and editor and viewer sharing with role changes and revoke, server-enforced access control, conflict detection, validation and error states.

**Incomplete or limited:**
- No real-time co-editing. Concurrent edits are detected (409 plus reload), not merged.
- Mocked auth only.
- You can share only with existing (seeded) accounts.
- On Render's free tier, data resets to the seed on redeploy or after idle restarts (no persistent disk).
- The Docker image was not built in my environment. The standalone server it packages was built and tested.

**Next 2–4 hours:** version history with restore, Markdown and PDF export, import into an existing document, Playwright in CI. Details are in ARCHITECTURE.md.
