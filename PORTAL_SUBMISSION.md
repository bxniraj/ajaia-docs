Ajaia Docs - lightweight collaborative document editor

Google Drive folder: [add Drive link]
Live app: [add deployed URL]
Walkthrough video: [add video link]

I built this with Next.js 16 and TypeScript, the TipTap editor, SQLite for storage, Zod for validation and Vitest for tests.


How to log in and test sharing

There are no passwords. On the login screen you just pick one of three demo users:

- Alice (alice@ajaia.test) owns "Q4 Planning Notes", which is shared with Bob as an editor. She can also view Bob's "Vendor Brief" but not edit it.
- Bob (bob@ajaia.test) owns "Vendor Brief" and can edit Alice's notes.
- Carol (carol@ajaia.test) starts with nothing, so she's the easiest way to test sharing from scratch.

A quick way to try everything: sign in as Alice and create a new document. Give it a name, write a few lines and try bold, italic, underline, headings and lists. Refresh the page and the content and formatting should still be there. Then click Share, add carol@ajaia.test with "Can view", and open a private window signed in as Carol. The document shows up under "Shared with me" and opens read-only. If Alice changes Carol to "Can edit", Carol can edit after a refresh. You can also use "Import file" to upload a .txt, .md or .docx file, which turns into a new editable document.


What works

You can create, rename, edit, delete and reopen documents. The editor supports bold, italic, underline, strikethrough, three heading sizes, bulleted and numbered lists, quotes, and undo/redo. Typing shortcuts like "# " for a heading or "- " for a list also work.

Documents save automatically a moment after you stop typing, and Ctrl+S saves right away. A small status line shows whether your changes are saved. If a save fails you get a retry button, and the page warns you before you leave with unsaved changes. If two people edit the same document and one saves first, the other gets a "reload latest" message instead of silently overwriting the first person's work.

File upload accepts .txt, .md and .docx files up to 2 MB, and the upload button says so. Headings, bold, italic, underline and lists come through. Images and tables inside Word files are dropped, and other file types are rejected with a clear message.

For sharing, the owner adds people by email as either an editor or a viewer, and can change or remove that access later. The dashboard keeps "My documents" and "Shared with me" separate. All permission checks happen on the server. Viewers can't edit, editors can't share or delete, and someone with no access gets a "not found" response, so they can't even tell the document exists.


Running it locally

You need Node 20 or newer. Run "npm install" and then "npm run dev", and open http://localhost:3000. "npm test" runs the tests. The database file is created and filled with the demo data automatically the first time the app runs. Deleting the data folder resets it.

The repo includes a Dockerfile and a Render config for deployment. One thing to know about Render's free plan: it has no permanent disk, so the data goes back to the demo state whenever the service redeploys or restarts after being idle. It stays put during normal use and across page refreshes. Attaching a disk fixes this without any code changes.


Main decisions

I kept everything in one Next.js app: the pages, the API and the database code. The API is a set of plain REST endpoints, which made it easy to test with curl.

I store document content as HTML rather than the editor's internal JSON. The file imports already produce HTML, and an export feature would need it anyway. Before anything is saved, the server strips out anything the editor doesn't support, so scripts and similar junk can't get stored even if someone skips the editor and calls the API directly. The downside is that JSON would be a better starting point for real-time editing later on.

All the permission rules live in one file, and every request goes through them. That made the rules easy to test and hard to get wrong in one route and right in another.

The login is fake, as the brief allows, but the session cookie is signed. Without that, anyone could edit their cookie and become another user, and the sharing demo wouldn't mean much.

I picked SQLite because reviewers don't need to set anything up, and it still gives real foreign keys, so removing a document also removes its shares. Switching to Postgres would only touch the database code.


What I left out on purpose

I didn't build real-time co-editing. Doing it properly needs websockets and a syncing library like Yjs, and a rushed version would be worse than reliable conflict detection. I also skipped real accounts and passwords, invites for people who don't have an account yet, and images, tables, comments and version history in the editor. I wanted the core features to be solid rather than have many half-finished ones.


Testing

There are 16 automated tests. They cover who can read, edit, share and delete; sharing, changing roles and revoking access; cleanup when a document is deleted; stripping unsafe HTML; the conflict check; all three import formats, including bad and empty files; and rejecting a tampered login cookie. I also checked the API by hand against the production build for the main error cases, and ran a headless browser through the whole flow, from logging in to checking the read-only view as a second user, with no console errors.


How I used AI

I used Claude as a coding assistant. [add any other tools you used]

It saved the most time on boilerplate: API routes, validation, database setup and styling. It also helped with the newest versions of Next.js and TipTap, where some APIs have changed recently.

Some of its output I changed or rejected. The browser test turned up a real bug: if you reloaded the page right after typing, the last few words could be lost, and the first version of the test missed this because it checked the wrong "Saved" label. I fixed the test and made the page send any unsaved changes as it closes. I also insisted on a signed cookie instead of a plain user ID, added the conflict check instead of letting the last save win, and fixed Word imports losing underlined text. I chose HTML over JSON for storage, and I held off on extra features partway through.

I didn't trust the code just because it looked right. Every feature listed above was checked with a test, a manual API call or the browser run.


What's not finished, and what I'd do next

Edits from two people are detected, not merged, and the login is a demo login. You can only share with the three existing accounts, and on the free host the data doesn't survive a restart.

With another 2 to 4 hours I would add version history with restore, then export to Markdown and PDF, then a way to import a file into an existing document, and then run the browser test automatically on every change.
