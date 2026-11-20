# Architecture Note

## What I optimized for

With 4–6 hours, I put the time into the parts a reviewer actually touches: an editor that feels solid, saving you can trust, and sharing rules that are enforced on the server. I left out anything that needs real infrastructure, such as live co-editing and real authentication.

## Shape of the system

```
Browser (React client components)
  ├─ TipTap editor ── autosave (debounced PATCH, one request in flight)
  ├─ Dashboard ───── create / import / delete
  └─ Share dialog ── grant / change role / revoke
        │  JSON over fetch (multipart for upload)
        ▼
Next.js route handlers (app/api/**)      ← Zod validation, AppError to JSON
        │
        ▼
lib/documents.ts   ← every read and write checks access here
        │
        ▼
SQLite (better-sqlite3): users, documents, document_shares
```

One deployable Next.js app holds the UI, the API and the DB access. Server components read straight from `lib/` for the first render, so there's no loading spinner on page load. Writes go through REST-style route handlers. I chose handlers over server actions because they're easy to curl, easy to test, and make the API surface explicit.

## Key decisions

**1. Store content as sanitized HTML, not ProseMirror JSON.**
HTML is what file import produces (Markdown and .docx both convert to HTML), what TipTap loads natively, and what a future export would need. Every write goes through a server-side allow-list (`lib/sanitize.ts`) that matches the editor's schema. That blocks scripts and event handlers even if a client bypasses the editor. The tradeoff: JSON would be better for structural diffing and for future CRDT collaboration. Migrating means a one-time conversion with `@tiptap/html`.

**2. One place for permissions.**
`lib/documents.ts` holds `getAccess()` plus `canEdit` and `canManage`. Every operation calls `requireAccess()` first. The roles are:

| | Owner | Editor | Viewer | No access |
|---|---|---|---|---|
| Read | ✓ | ✓ | ✓ | 404 |
| Edit title/content | ✓ | ✓ | 403 | 404 |
| Share / change roles / revoke | ✓ | 403 | 403 | 404 |
| Delete | ✓ | 403 | 403 | 404 |

Returning 404 rather than 403 when you have no access avoids confirming that a document ID exists. The UI also hides controls you can't use, but the server is the source of truth.

**3. Autosave with an optimistic concurrency check.**
The client batches edits, debounces for 800 ms, and keeps at most one request in flight. Each save sends the `updatedAt` it last saw. If the server's copy is newer, it returns 409 and the UI shows "Reload latest" instead of letting the last write win. This is deliberately not real-time collaboration. It is the minimum that stops two editors from silently destroying each other's work.

**4. Mocked authentication, but tamper-proof.**
You pick a seeded user and the session cookie stores `userId.HMAC`. It is `httpOnly` and `SameSite=Lax`, and verified with a constant-time compare. There are no passwords, which the brief allows. Without the HMAC, anyone could edit the cookie and become another user, and the sharing demo would mean nothing.

**5. SQLite.**
It needs no setup for reviewers and gives real foreign keys (`ON DELETE CASCADE` removes shares with their document) and transactions. The data access layer is plain SQL behind functions that take a `db` handle, which also lets the tests run against `:memory:`. Moving to Postgres means swapping the driver and placeholder syntax in two files.

**6. File import makes a new document.**
Of the options in the brief, this is the most product-relevant and the easiest to verify. Conversion: `.txt` gets paragraphs split on blank lines with escaped HTML, `.md` goes through `marked`, and `.docx` goes through `mammoth` with an explicit `u => u` style map, because mammoth drops underline by default. All three outputs then go through the same sanitizer. Limits are 2 MB, and the extension is checked against an allow-list.

## Validation and error handling

- Zod schemas on every body: title 1–200 characters, content up to 1 MB, valid email, role enum.
- `handle()` wraps every route and turns `AppError` and `ZodError` into `{ error }` JSON with the right status. Unexpected errors are logged and return a generic 500.
- The client shows server messages inline: dashboard errors, title validation, a save-failed banner with Retry, and share errors.

## Deliberately not built

| Cut | Why |
|---|---|
| Real-time co-editing / presence | Needs WebSockets plus a CRDT (Yjs). Too big for the timebox to do properly, and a half-version would be worse than the conflict check. |
| Real auth (passwords/OAuth) | The brief allows mocked users. Signed cookies keep the demo honest. |
| Sharing with users who don't exist yet / invite emails | Needs email infrastructure. Sharing is limited to existing accounts and says so. |
| Images, tables, comments, version history | Each is a feature in its own right. Depth over breadth. |
| Durable storage on the free host | See the README deployment caveat. A config change, not a code change. |

## What I'd build next (2–4 more hours)

1. **Version history:** a `document_versions` table snapshotted on save (throttled), with a "restore" UI. This also makes the 409 path friendlier, because you could diff your copy against theirs.
2. **Export to Markdown and PDF** from the stored HTML.
3. **"Import into this document"**, to insert a file at the cursor of an existing draft.
4. **Playwright in CI**, using the existing `scripts/e2e-smoke.py` flow as the base.
5. Then real-time collaboration with Yjs and Hocuspocus, storing Yjs updates instead of HTML.
