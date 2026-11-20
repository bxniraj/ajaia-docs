import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDocument } from "@/lib/documents";
import { AppError, handle } from "@/lib/errors";
import { fileToDocument } from "@/lib/import";

export const runtime = "nodejs";

/** Upload a .txt / .md / .docx file and turn it into a new editable document. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const form = await req.formData().catch(() => {
    throw new AppError(400, "Expected a multipart form upload");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError(400, "No file was uploaded");

  const { title, html } = await fileToDocument(file.name, Buffer.from(await file.arrayBuffer()));
  const doc = createDocument(getDb(), user.id, { title, content: html });
  return NextResponse.json(doc, { status: 201 });
});
