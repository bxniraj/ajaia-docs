"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/documents";
import { api } from "./api";

export default function AppHeader({ user }: { user: User }) {
  const router = useRouter();

  async function signOut() {
    await api("/api/session", { method: "DELETE" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="app-header">
      <Link href="/docs" className="brand">
        <span className="brand-mark">A</span> Ajaia Docs
      </Link>
      <div className="header-user">
        <span className="avatar sm">{user.name[0]}</span>
        <span className="small">
          {user.name} <span className="muted">({user.email})</span>
        </span>
        <button className="btn ghost sm" onClick={signOut}>
          Switch user
        </button>
      </div>
    </header>
  );
}
