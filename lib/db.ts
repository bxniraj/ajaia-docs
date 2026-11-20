import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type DB = Database.Database;

export const SEED_USERS = [
  { id: "u_alice", email: "alice@ajaia.test", name: "Alice Chen" },
  { id: "u_bob", email: "bob@ajaia.test", name: "Bob Okafor" },
  { id: "u_carol", email: "carol@ajaia.test", name: "Carol Diaz" },
] as const;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',       -- sanitized HTML produced by the editor
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);

CREATE TABLE IF NOT EXISTS document_shares (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_shares_user ON document_shares(user_id);
`;

/** Create (or open) a database, apply the schema and seed demo data if empty. */
export function openDb(file: string): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(db: DB) {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  if (count > 0) return;

  const now = Date.now();
  const insertUser = db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)");
  const insertDoc = db.prepare(
    "INSERT INTO documents (id, owner_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertShare = db.prepare(
    "INSERT INTO document_shares (document_id, user_id, role, created_at) VALUES (?, ?, ?, ?)",
  );

  db.transaction(() => {
    for (const u of SEED_USERS) insertUser.run(u.id, u.email, u.name);

    insertDoc.run(
      "d_welcome",
      "u_alice",
      "Q4 Planning Notes",
      "<h1>Q4 Planning Notes</h1><p>This document is <strong>owned by Alice</strong> and shared with <em>Bob as an editor</em>.</p><h2>Goals</h2><ul><li><p>Ship the internal docs pilot</p></li><li><p>Collect feedback from <u>two teams</u></p></li></ul><h2>Open questions</h2><ol><li><p>Do we need comments in v1?</p></li><li><p>Who owns onboarding?</p></li></ol>",
      now,
      now,
    );
    insertShare.run("d_welcome", "u_bob", "editor", now);

    insertDoc.run(
      "d_bob_brief",
      "u_bob",
      "Vendor Brief (read-only for Alice)",
      "<h1>Vendor Brief</h1><p>Owned by Bob. Alice has <strong>viewer</strong> access, so she can read but not edit.</p>",
      now,
      now,
    );
    insertShare.run("d_bob_brief", "u_alice", "viewer", now);
  })();
}

const globalForDb = globalThis as unknown as { __ajaiaDb?: DB };

/** Process-wide singleton used by route handlers and server components. */
export function getDb(): DB {
  if (!globalForDb.__ajaiaDb) {
    const file = process.env.DB_PATH ?? path.join(process.cwd(), "data", "ajaia.db");
    globalForDb.__ajaiaDb = openDb(file);
  }
  return globalForDb.__ajaiaDb;
}
