import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getDocument, type DocDetail } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import AppHeader from "@/components/AppHeader";
import DocumentEditor from "@/components/DocumentEditor";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let doc: DocDetail;
  try {
    doc = getDocument(getDb(), id, user.id);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }

  return (
    <>
      <AppHeader user={user} />
      <DocumentEditor initialDoc={doc} />
    </>
  );
}
