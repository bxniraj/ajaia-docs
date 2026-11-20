import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listUsers } from "@/lib/documents";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/docs");
  const users = listUsers(getDb());
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand brand-lg">
          <span className="brand-mark">A</span> Ajaia Docs
        </div>
        <p className="muted">
          Demo sign-in: pick a seeded account. Open a second browser (or a private window) as another user to test
          sharing.
        </p>
        <LoginForm users={users} />
      </div>
    </main>
  );
}
