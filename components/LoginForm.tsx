"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/documents";
import { api } from "./api";

export default function LoginForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(userId: string) {
    setPending(userId);
    setError(null);
    try {
      await api("/api/session", { method: "POST", body: JSON.stringify({ userId }) });
      router.replace("/docs");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(null);
    }
  }

  return (
    <div className="user-list">
      {users.map((u) => (
        <button key={u.id} className="user-option" disabled={pending !== null} onClick={() => signIn(u.id)}>
          <span className="avatar">{u.name[0]}</span>
          <span>
            <strong>{u.name}</strong>
            <span className="muted small">{u.email}</span>
          </span>
          {pending === u.id && <span className="muted small">Signing in…</span>}
        </button>
      ))}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
