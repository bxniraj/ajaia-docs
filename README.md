# Ajaia Docs

A lightweight collaborative document editor: create and format documents in the browser, import files, and share documents with other users as editors or viewers.

**Live demo:** https://ajaia-docs-xvfp.onrender.com (free tier: first load after idle can take ~50 s)

**Stack:** Next.js 16 (App Router) + TypeScript, TipTap 3 (ProseMirror) editor, SQLite via `better-sqlite3`, Zod validation, Vitest.

---

## Demo accounts

Sign-in is mocked: pick an account on the login screen. No passwords.

| User | Email | Seeded data |
|---|---|---|
| Alice Chen | `alice@ajaia.test` | Owns **Q4 Planning Notes** (shared with Bob as editor). Has view-only access to Bob's **Vendor Brief**. |
| Bob Okafor | `bob@ajaia.test` | Owns **Vendor Brief**. Can edit Alice's **Q4 Planning Notes**. |
| Carol Diaz | `carol@ajaia.test` | Nothing yet. Use her to test sharing from scratch. |

**To test sharing:** open the app in two browsers, or a normal window plus a private window, and sign in as a different user in each. Share a document from one; refresh the other's dashboard.

## Features

| Area | What works |
|---|---|
| Documents | Create, rename (inline title), edit, delete (owner only), reopen from the dashboard |
| Rich text | Bold, italic, underline, strikethrough, headings H1–H3, bulleted and numbered lists, blockquote, undo/redo, Markdown-style shortcuts (`# `, `- `, `1. `, `**bold**`) |
| Saving | Autosave 800 ms after you stop typing, `Ctrl/Cmd+S` to save now, live status (Unsaved / Saving / Saved), retry on failure, warning before leaving with unsaved edits, a keepalive save if the tab closes mid-debounce |
| Concurrency | Optimistic version check. If someone else saved first, you get a "Reload latest" banner (HTTP 409) instead of silently overwriting their work. |
| File import | Upload **.txt, .md, .docx** (max 2 MB) and it becomes a new editable document. Headings, bold, italic, underline and lists are kept. Other file types are rejected with a clear message. |
| Sharing | The owner shares by email as **Can edit** or **Can view**, can change roles, and can remove access. The dashboard separates **My documents** from **Shared with me**, with role badges. Viewers get a read-only editor with no toolbar. |
| Access control | Enforced on the server for every request. A document you can't access returns 404, so its existence is not revealed. Editors can't share or delete. Viewers can't write. |

## Run locally

Requirements: Node 20+ (tested on 22) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

The SQLite database is created at `./data/ajaia.db` on first request and seeded with the demo users and documents. To reset everything, delete the `data/` folder.

Optional environment variables (see `.env.example`):

| Var | Default | Purpose |
|---|---|---|
| `SESSION_SECRET` | dev value | HMAC key for the session cookie. **Set this in production.** |
| `DB_PATH` | `./data/ajaia.db` | Location of the SQLite file |

Production build:

```bash
npm run build && npm start
```

## Tests

```bash
npm test             # Vitest: 16 tests, runs in about 1 s
npm run typecheck
```

- `tests/documents.test.ts` covers the access matrix (owner, editor, viewer, no access), owned versus shared listing, re-share and revoke, cascade on delete, HTML sanitization, and stale-write rejection (409).
- `tests/import.test.ts` covers .txt, .md and .docx conversion (it builds a real .docx in the test), plus unsupported, empty and corrupt files.
- `tests/auth.test.ts` checks that session cookie signing rejects tampered cookies.
- `scripts/e2e-smoke.py` is an optional Playwright browser run of the full flow: log in, create, format, reload, share, then a viewer sees a read-only copy. It also writes the screenshots in `docs/screenshots/`.

## Deployment

The app ships as a Next.js standalone server with a `Dockerfile` and a Render blueprint (`render.yaml`).

**Render (free):** push to GitHub, then go to Render → New → Blueprint and select the repo. Render builds the Dockerfile and generates `SESSION_SECRET`.

> ⚠️ **Free-tier persistence caveat.** Render's free plan has no persistent disk. The SQLite file resets to the seeded demo data whenever the service redeploys or restarts after idling (about 15 minutes). Data does persist across page refreshes and normal use within a running instance. For durable storage, either attach a disk on a paid plan and point `DB_PATH` at it, or deploy to Railway or Fly.io with a volume. The code does not change.

Any Docker host works: `docker build -t ajaia-docs . && docker run -p 3000:3000 -e SESSION_SECRET=... -v ajaia-data:/app/data ajaia-docs`.

The app is **not** suited to Vercel or other serverless hosts as-is. SQLite needs a long-lived process with a writable disk. See ARCHITECTURE.md for how to swap in Postgres.

## Supported file types

**.txt, .md / .markdown, .docx** only, up to 2 MB. The import button and the README both say this.
- `.docx`: text structure (headings, bold, italic, underline, lists, links) is kept. Images, tables, comments and tracked changes are dropped.
- `.doc` (legacy Word), PDF and images are not supported.

## Project layout

```
app/                    Pages (server components) and API route handlers
  api/session           Mock sign-in / sign-out
  api/documents         List, create
  api/documents/[id]    Get, update (title/content), delete
  api/documents/[id]/shares   List, grant/change role, revoke
  api/documents/import  File upload to a new document
components/             Client UI: editor, toolbar, share dialog, dashboard
lib/
  db.ts                 Schema, connection, seed data
  documents.ts          Data access + all permission rules (one place)
  auth.ts               Signed-cookie session
  import.ts             .txt / .md / .docx to HTML
  sanitize.ts           HTML allow-list (server-side)
  validation.ts         Zod schemas and limits
tests/                  Vitest
```

See **ARCHITECTURE.md** for design decisions and **AI_WORKFLOW.md** for how AI tools were used.
