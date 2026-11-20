import { nanoid } from "nanoid";
import type { DB } from "./db";
import { AppError, forbidden, notFound } from "./errors";
import { sanitizeContent } from "./sanitize";

export type Role = "viewer" | "editor";
export type Access = "owner" | Role;

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface DocSummary {
  id: string;
  title: string;
  updatedAt: number;
  ownerId: string;
  ownerName: string;
}

export interface SharedDocSummary extends DocSummary {
  role: Role;
}

export interface DocDetail extends DocSummary {
  content: string;
  createdAt: number;
  access: Access;
}

export interface ShareEntry {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

// ---------- access rules (the single place permissions are decided) ----------

export const canEdit = (a: Access | null) => a === "owner" || a === "editor";
export const canManage = (a: Access | null) => a === "owner";

export function getAccess(db: DB, docId: string, userId: string): Access | null {
  const doc = db.prepare("SELECT owner_id FROM documents WHERE id = ?").get(docId) as
    | { owner_id: string }
    | undefined;
  if (!doc) return null;
  if (doc.owner_id === userId) return "owner";
  const share = db
    .prepare("SELECT role FROM document_shares WHERE document_id = ? AND user_id = ?")
    .get(docId, userId) as { role: Role } | undefined;
  return share?.role ?? null;
}

/** Throws 404 when the user has no access at all, so we never leak that a doc exists. */
function requireAccess(db: DB, docId: string, userId: string): Access {
  const access = getAccess(db, docId, userId);
  if (!access) throw notFound();
  return access;
}

// ---------- users ----------

export function listUsers(db: DB): User[] {
  return db.prepare("SELECT id, email, name FROM users ORDER BY name").all() as User[];
}

export function getUser(db: DB, id: string): User | null {
  return (db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(id) as User) ?? null;
}

// ---------- documents ----------

export function listDocuments(db: DB, userId: string): { owned: DocSummary[]; shared: SharedDocSummary[] } {
  const owned = db
    .prepare(
      `SELECT d.id, d.title, d.updated_at AS updatedAt, d.owner_id AS ownerId, u.name AS ownerName
       FROM documents d JOIN users u ON u.id = d.owner_id
       WHERE d.owner_id = ? ORDER BY d.updated_at DESC`,
    )
    .all(userId) as DocSummary[];

  const shared = db
    .prepare(
      `SELECT d.id, d.title, d.updated_at AS updatedAt, d.owner_id AS ownerId, u.name AS ownerName, s.role
       FROM document_shares s
       JOIN documents d ON d.id = s.document_id
       JOIN users u ON u.id = d.owner_id
       WHERE s.user_id = ? ORDER BY d.updated_at DESC`,
    )
    .all(userId) as SharedDocSummary[];

  return { owned, shared };
}

export function createDocument(
  db: DB,
  ownerId: string,
  input: { title?: string; content?: string } = {},
): DocDetail {
  const id = nanoid(12);
  const now = Date.now();
  const title = input.title?.trim() || "Untitled document";
  const content = sanitizeContent(input.content ?? "");
  db.prepare(
    "INSERT INTO documents (id, owner_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, ownerId, title, content, now, now);
  return getDocument(db, id, ownerId);
}

export function getDocument(db: DB, docId: string, userId: string): DocDetail {
  const access = requireAccess(db, docId, userId);
  const row = db
    .prepare(
      `SELECT d.id, d.title, d.content, d.created_at AS createdAt, d.updated_at AS updatedAt,
              d.owner_id AS ownerId, u.name AS ownerName
       FROM documents d JOIN users u ON u.id = d.owner_id WHERE d.id = ?`,
    )
    .get(docId) as Omit<DocDetail, "access">;
  return { ...row, access };
}

export function updateDocument(
  db: DB,
  docId: string,
  userId: string,
  patch: { title?: string; content?: string; baseUpdatedAt?: number },
): DocDetail {
  const access = requireAccess(db, docId, userId);
  if (!canEdit(access)) throw forbidden("You have view-only access to this document");

  const current = db.prepare("SELECT updated_at FROM documents WHERE id = ?").get(docId) as {
    updated_at: number;
  };
  // Optimistic concurrency: reject a content write based on a stale copy.
  if (
    patch.content !== undefined &&
    patch.baseUpdatedAt !== undefined &&
    patch.baseUpdatedAt < current.updated_at
  ) {
    throw new AppError(409, "This document was changed by someone else. Reload to get the latest version.");
  }

  const now = Math.max(Date.now(), current.updated_at + 1);
  db.prepare(
    `UPDATE documents SET
       title = COALESCE(?, title),
       content = COALESCE(?, content),
       updated_at = ?
     WHERE id = ?`,
  ).run(
    patch.title?.trim() ?? null,
    patch.content !== undefined ? sanitizeContent(patch.content) : null,
    now,
    docId,
  );
  return getDocument(db, docId, userId);
}

export function deleteDocument(db: DB, docId: string, userId: string): void {
  const access = requireAccess(db, docId, userId);
  if (!canManage(access)) throw forbidden("Only the owner can delete this document");
  db.prepare("DELETE FROM documents WHERE id = ?").run(docId);
}

// ---------- sharing ----------

export function listShares(db: DB, docId: string, userId: string): ShareEntry[] {
  requireAccess(db, docId, userId);
  return db
    .prepare(
      `SELECT u.id AS userId, u.email, u.name, s.role
       FROM document_shares s JOIN users u ON u.id = s.user_id
       WHERE s.document_id = ? ORDER BY u.name`,
    )
    .all(docId) as ShareEntry[];
}

export function shareDocument(db: DB, docId: string, actorId: string, email: string, role: Role): ShareEntry {
  const access = requireAccess(db, docId, actorId);
  if (!canManage(access)) throw forbidden("Only the owner can share this document");

  const target = db.prepare("SELECT id, email, name FROM users WHERE email = ?").get(email.toLowerCase()) as
    | User
    | undefined;
  if (!target) throw new AppError(404, `No user with email ${email}`);
  if (target.id === actorId) throw new AppError(400, "You already own this document");

  // Upsert: sharing again with a different role updates it.
  db.prepare(
    `INSERT INTO document_shares (document_id, user_id, role, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(document_id, user_id) DO UPDATE SET role = excluded.role`,
  ).run(docId, target.id, role, Date.now());

  return { userId: target.id, email: target.email, name: target.name, role };
}

export function revokeShare(db: DB, docId: string, actorId: string, targetUserId: string): void {
  const access = requireAccess(db, docId, actorId);
  if (!canManage(access)) throw forbidden("Only the owner can change sharing");
  db.prepare("DELETE FROM document_shares WHERE document_id = ? AND user_id = ?").run(docId, targetUserId);
}
