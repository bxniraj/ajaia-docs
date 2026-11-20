Ajaia Docs - a lightweight collaborative document editor

Live app: https://ajaia-docs-xvfp.onrender.com
GitHub repo: https://github.com/bxniraj/ajaia-docs

The app runs on Render's free plan, so if nobody has used it for a while, the first page load can take up to a minute. The repo contains everything: source code, README, architecture note, AI workflow note, SUBMISSION.md, the video link and screenshots.

Stack: Next.js 16 with TypeScript, the TipTap editor, SQLite, Zod for validation and Vitest for tests.


Test accounts

There are no passwords. On the login screen you pick one of three demo users:

- Alice (alice@ajaia.test) owns "Q4 Planning Notes", which she has shared with Bob as an editor. She can also view Bob's "Vendor Brief" but not edit it.
- Bob (bob@ajaia.test) owns "Vendor Brief" and can edit Alice's notes.
- Carol (carol@ajaia.test) starts with no documents, so she's the easiest way to test sharing from scratch.

To try the main flow in a few minutes:
1. Sign in as Alice and create a new document. Give it a name, write a few lines, and try bold, italic, underline, headings and lists.
2. Refresh the page. The content and formatting are still there.
3. Click Share and add carol@ajaia.test with "Can view".
4. Open a private window and sign in as Carol. The document appears under "Shared with me" and opens read-only.
5. Back as Alice, change Carol to "Can edit". After a refresh, Carol can edit it.
6. Use "Import file" to upload a .txt, .md or .docx file. It becomes a new editable document.


What works

Documents can be created, renamed, edited, deleted and reopened. The editor supports bold, italic, underline, strikethrough, three heading sizes, bulleted and numbered lists, quotes, and undo/redo. Shortcuts like "# " for a heading or "- " for a list work too.

Changes save automatically a moment after you stop typing, and Ctrl+S saves immediately. A status line shows whether everything is saved. If a save fails, a retry button appears, and the browser warns you before you leave with unsaved changes. If two people edit the same document and one saves first, the other is asked to reload instead of silently overwriting the first person's work.

File import accepts .txt, .md and .docx files up to 2 MB, and the import button states this. Headings, bold, italic, underline and lists are kept. Images and tables inside Word files are dropped. Any other file type is rejected with a clear message.

The owner shares a document by email as either an editor or a viewer, and can change or remove that access later. The dashboard keeps "My documents" and "Shared with me" in separate lists. Permissions are enforced on the server for every request: viewers can't edit, editors can't share or delete, and anyone without access gets a "not found" response, so they can't even tell the document exists.


Running it locally

You need Node 20 or newer. Run "npm install", then "npm run dev", and open http://localhost:3000. Run "npm test" for the tests. The database is created and filled with the demo data the first time the app runs. Deleting the data folder resets it.

The repo also includes a Dockerfile and a Render config. Render's free plan has no permanent disk, so the data resets to the demo state whenever the service redeploys or restarts after being idle. It persists through normal use and page refreshes. Attaching a disk would fix this without any code changes.


Key decisions

Everything lives in one Next.js app: pages, API and database code. The API is a small set of plain REST endpoints, which kept it easy to test directly.

Document content is stored as HTML rather than the editor's internal JSON. The file imports already produce HTML, and a future export feature would need it too. Before anything is saved, the server strips out anything the editor doesn't support, so scripts can't be stored even if someone bypasses the editor and calls the API directly. The tradeoff is that JSON would be a better base for real-time editing later.

All permission rules sit in one module that every request goes through. That keeps them easy to test and consistent across routes.

Login is simulated, which the brief allows, but the session cookie is signed. Otherwise anyone could edit their cookie to become another user, and the sharing model would mean nothing.

I chose SQLite because reviewers don't have to set anything up, and it still gives real foreign keys, so deleting a document also removes its shares. Moving to Postgres would only touch the database layer.


What I left out on purpose

I didn't build real-time co-editing. Doing it properly needs websockets and a sync library like Yjs, and a rushed version would be worse than reliable conflict detection. I also skipped real accounts and passwords, invitations for people without an account, and images, tables, comments and version history in the editor. I preferred a few solid features over many half-finished ones.


Testing

There are 16 automated tests. They cover:
- who can read, edit, share and delete
- sharing, changing roles and revoking access
- cleanup when a document is deleted
- removal of unsafe HTML
- the edit-conflict check
- all three import formats, including empty and broken files
- rejection of a tampered login cookie

I also checked the main error cases against the production build by calling the API directly. A headless browser ran the full flow, from login through to the read-only view as a second user, with no console errors. After deploying, I repeated a create, save, read and delete check on the live site.


How I used AI

I used Claude as a coding assistant throughout the project.

It saved the most time on boilerplate: API routes, validation, database setup and styling. It also helped with the latest versions of Next.js and TipTap, where several APIs have recently changed.

Some of its output I changed or rejected:
- The browser test found a real bug. Reloading the page right after typing could lose the last few words. The first version of the test missed it because it checked the wrong "Saved" label. I fixed the test and made the page send any unsaved changes as it closes.
- I insisted on a signed session cookie instead of a plain user ID.
- I added the conflict check instead of letting the last save win.
- I fixed Word imports, which were losing underlined text.
- I chose HTML over JSON for storage.
- I held off on extra features partway through to protect the core.

I didn't trust code because it looked right. Every feature listed here was confirmed by a test, a direct API call or the browser run.


Limitations and next steps

Simultaneous edits are detected but not merged, and login is simulated. Documents can only be shared with the three demo accounts. On the free host, data doesn't survive a restart.

With another 2 to 4 hours, I would add, in order:
1. Version history with restore.
2. Export to Markdown and PDF.
3. Importing a file into an existing document.
4. Running the browser test automatically on every change.
