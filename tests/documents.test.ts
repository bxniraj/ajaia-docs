import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "@/lib/db";
import {
  createDocument,
  deleteDocument,
  getAccess,
  getDocument,
  listDocuments,
  listShares,
  revokeShare,
  shareDocument,
  updateDocument,
} from "@/lib/documents";
import { AppError } from "@/lib/errors";

// Seeded users: u_alice, u_bob, u_carol (see lib/db.ts)
let db: DB;
beforeEach(() => {
  db = openDb(":memory:");
});

function expectStatus(fn: () => unknown, status: number) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).status).toBe(status);
    return;
  }
  throw new Error(`expected AppError ${status}`);
}

describe("document ownership and sharing", () => {
  it("separates owned and shared documents per user", () => {
    const doc = createDocument(db, "u_alice", { title: "Roadmap" });
    shareDocument(db, doc.id, "u_alice", "carol@ajaia.test", "viewer");

    const alice = listDocuments(db, "u_alice");
    const carol = listDocuments(db, "u_carol");
    expect(alice.owned.map((d) => d.id)).toContain(doc.id);
    expect(alice.shared.map((d) => d.id)).not.toContain(doc.id);
    expect(carol.owned).toHaveLength(0);
    expect(carol.shared).toEqual([expect.objectContaining({ id: doc.id, role: "viewer", ownerName: "Alice Chen" })]);
  });

  it("hides documents from users without access (404, not 403)", () => {
    const doc = createDocument(db, "u_alice", { title: "Private" });
    expect(getAccess(db, doc.id, "u_carol")).toBeNull();
    expectStatus(() => getDocument(db, doc.id, "u_carol"), 404);
    expectStatus(() => updateDocument(db, doc.id, "u_carol", { content: "<p>x</p>" }), 404);
  });

  it("lets editors edit but not share or delete", () => {
    const doc = createDocument(db, "u_alice");
    shareDocument(db, doc.id, "u_alice", "bob@ajaia.test", "editor");

    const updated = updateDocument(db, doc.id, "u_bob", { title: "Bob renamed", content: "<p><strong>hi</strong></p>" });
    expect(updated.title).toBe("Bob renamed");
    expect(updated.content).toBe("<p><strong>hi</strong></p>");
    expectStatus(() => shareDocument(db, doc.id, "u_bob", "carol@ajaia.test", "editor"), 403);
    expectStatus(() => deleteDocument(db, doc.id, "u_bob"), 403);
  });

  it("makes viewers read-only", () => {
    const doc = createDocument(db, "u_alice", { content: "<p>original</p>" });
    shareDocument(db, doc.id, "u_alice", "bob@ajaia.test", "viewer");
    expect(getDocument(db, doc.id, "u_bob").access).toBe("viewer");
    expectStatus(() => updateDocument(db, doc.id, "u_bob", { content: "<p>hacked</p>" }), 403);
    expect(getDocument(db, doc.id, "u_alice").content).toBe("<p>original</p>");
  });

  it("re-sharing updates the role and revoking removes access", () => {
    const doc = createDocument(db, "u_alice");
    shareDocument(db, doc.id, "u_alice", "bob@ajaia.test", "viewer");
    shareDocument(db, doc.id, "u_alice", "BOB@ajaia.test", "editor");
    expect(listShares(db, doc.id, "u_alice")).toEqual([expect.objectContaining({ userId: "u_bob", role: "editor" })]);

    revokeShare(db, doc.id, "u_alice", "u_bob");
    expect(getAccess(db, doc.id, "u_bob")).toBeNull();
  });

  it("rejects sharing with unknown users or yourself", () => {
    const doc = createDocument(db, "u_alice");
    expectStatus(() => shareDocument(db, doc.id, "u_alice", "nobody@ajaia.test", "editor"), 404);
    expectStatus(() => shareDocument(db, doc.id, "u_alice", "alice@ajaia.test", "editor"), 400);
  });

  it("deleting a document removes its shares", () => {
    const doc = createDocument(db, "u_alice");
    shareDocument(db, doc.id, "u_alice", "bob@ajaia.test", "editor");
    deleteDocument(db, doc.id, "u_alice");
    expect(listDocuments(db, "u_bob").shared.map((d) => d.id)).not.toContain(doc.id);
  });
});

describe("content persistence", () => {
  it("preserves supported formatting and strips unsafe markup", () => {
    const html =
      '<h2>Title</h2><p><strong>b</strong> <em>i</em> <u>u</u></p><ul><li><p>one</p></li></ul>' +
      '<script>alert(1)</script><p onclick="x()">click</p><img src=x onerror=alert(1)>';
    const doc = createDocument(db, "u_alice", { content: html });
    expect(doc.content).toContain("<h2>Title</h2>");
    expect(doc.content).toContain("<u>u</u>");
    expect(doc.content).toContain("<ul><li><p>one</p></li></ul>");
    expect(doc.content).not.toMatch(/script|onclick|onerror|<img/);
  });

  it("rejects a content save based on a stale version (409)", () => {
    const doc = createDocument(db, "u_alice");
    shareDocument(db, doc.id, "u_alice", "bob@ajaia.test", "editor");
    const base = doc.updatedAt;

    updateDocument(db, doc.id, "u_bob", { content: "<p>bob</p>", baseUpdatedAt: base });
    expectStatus(() => updateDocument(db, doc.id, "u_alice", { content: "<p>alice</p>", baseUpdatedAt: base }), 409);
    expect(getDocument(db, doc.id, "u_alice").content).toBe("<p>bob</p>");
  });
});
