"use client";

import { useEffect, useState } from "react";
import type { Role, ShareEntry } from "@/lib/documents";
import { api } from "./api";

const DEMO_EMAILS = ["alice@ajaia.test", "bob@ajaia.test", "carol@ajaia.test"];

interface Props {
  docId: string;
  isOwner: boolean;
  ownerName: string;
  onClose: () => void;
}

export default function SharePanel({ docId, isOwner, ownerName, onClose }: Props) {
  const [shares, setShares] = useState<ShareEntry[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ shares: ShareEntry[] }>(`/api/documents/${docId}/shares`)
      .then((r) => setShares(r.shares))
      .catch((e) => setError(e.message));
  }, [docId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function grant(targetEmail: string, targetRole: Role) {
    setBusy(true);
    setError(null);
    try {
      const entry = await api<ShareEntry>(`/api/documents/${docId}/shares`, {
        method: "POST",
        body: JSON.stringify({ email: targetEmail, role: targetRole }),
      });
      setShares((prev) => [...(prev ?? []).filter((s) => s.userId !== entry.userId), entry]);
      setEmail("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(userId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/documents/${docId}/shares`, { method: "DELETE", body: JSON.stringify({ userId }) });
      setShares((prev) => (prev ?? []).filter((s) => s.userId !== userId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="share-title">{isOwner ? "Share document" : "People with access"}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {isOwner && (
          <form
            className="share-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) void grant(email.trim(), role);
            }}
          >
            <input
              type="email"
              placeholder="Add people by email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              list="demo-emails"
              required
              aria-label="Email to share with"
            />
            <datalist id="demo-emails">
              {DEMO_EMAILS.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Access level">
              <option value="editor">Can edit</option>
              <option value="viewer">Can view</option>
            </select>
            <button className="btn primary" disabled={busy}>
              Share
            </button>
          </form>
        )}
        {error && <p className="error">{error}</p>}

        <ul className="share-list">
          <li>
            <span className="avatar sm">{ownerName[0]}</span>
            <span className="grow">{ownerName}</span>
            <span className="muted small">Owner</span>
          </li>
          {shares === null && <li className="muted small">Loading…</li>}
          {shares?.map((s) => (
            <li key={s.userId}>
              <span className="avatar sm">{s.name[0]}</span>
              <span className="grow">
                {s.name} <span className="muted small">{s.email}</span>
              </span>
              {isOwner ? (
                <>
                  <select
                    value={s.role}
                    disabled={busy}
                    onChange={(e) => void grant(s.email, e.target.value as Role)}
                    aria-label={`Access for ${s.name}`}
                  >
                    <option value="editor">Can edit</option>
                    <option value="viewer">Can view</option>
                  </select>
                  <button className="btn ghost sm danger" disabled={busy} onClick={() => void revoke(s.userId)}>
                    Remove
                  </button>
                </>
              ) : (
                <span className="muted small">{s.role === "editor" ? "Can edit" : "Can view"}</span>
              )}
            </li>
          ))}
        </ul>
        {isOwner && <p className="muted small">Demo accounts: {DEMO_EMAILS.join(", ")}</p>}
      </div>
    </div>
  );
}
