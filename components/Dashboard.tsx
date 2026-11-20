"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { DocDetail, DocSummary, SharedDocSummary } from "@/lib/documents";
import { api, formatTime } from "./api";

const ACCEPT = ".txt,.md,.markdown,.docx";

export default function Dashboard({ owned, shared }: { owned: DocSummary[]; shared: SharedDocSummary[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"create" | "upload" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createDoc() {
    setBusy("create");
    setError(null);
    try {
      const doc = await api<DocDetail>("/api/documents", { method: "POST", body: "{}" });
      router.push(`/docs/${doc.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setBusy("upload");
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const doc = await api<DocDetail>("/api/documents/import", { method: "POST", body: form });
      router.push(`/docs/${doc.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(doc: DocSummary) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="dashboard">
      <section className="actions">
        <button className="btn primary" onClick={createDoc} disabled={busy !== null}>
          {busy === "create" ? "Creating…" : "+ New document"}
        </button>
        <button className="btn" onClick={() => fileInput.current?.click()} disabled={busy !== null}>
          {busy === "upload" ? "Importing…" : "Import file"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <span className="muted small">Import supports .txt, .md and .docx (max 2 MB) and creates a new document.</span>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <DocSection title="My documents" empty="You haven't created any documents yet.">
        {owned.map((d) => (
          <li key={d.id} className="doc-row">
            <Link href={`/docs/${d.id}`} className="doc-link">
              <span className="doc-icon" aria-hidden>
                ▤
              </span>
              <span className="doc-title">{d.title}</span>
            </Link>
            <span className="badge owner">Owner</span>
            <span className="muted small">Edited {formatTime(d.updatedAt)}</span>
            <button className="btn ghost sm danger" onClick={() => remove(d)} aria-label={`Delete ${d.title}`}>
              Delete
            </button>
          </li>
        ))}
      </DocSection>

      <DocSection title="Shared with me" empty="Nothing has been shared with you yet.">
        {shared.map((d) => (
          <li key={d.id} className="doc-row">
            <Link href={`/docs/${d.id}`} className="doc-link">
              <span className="doc-icon shared" aria-hidden>
                ▤
              </span>
              <span className="doc-title">{d.title}</span>
            </Link>
            <span className={`badge ${d.role}`}>{d.role === "editor" ? "Can edit" : "View only"}</span>
            <span className="muted small">
              From {d.ownerName} · {formatTime(d.updatedAt)}
            </span>
            <span />
          </li>
        ))}
      </DocSection>
    </main>
  );
}

function DocSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="doc-section">
      <h2>{title}</h2>
      {children.length === 0 ? <p className="muted empty">{empty}</p> : <ul className="doc-list">{children}</ul>}
    </section>
  );
}
