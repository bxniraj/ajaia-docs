import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listDocuments } from "@/lib/documents";
import AppHeader from "@/components/AppHeader";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, shared } = listDocuments(getDb(), user.id);
  return (
    <>
      <AppHeader user={user} />
      <Dashboard owned={owned} shared={shared} />
    </>
  );
}
