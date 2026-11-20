import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDocument, listDocuments } from "@/lib/documents";
import { handle } from "@/lib/errors";
import { createDocSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handle(async () => {
  const user = await requireUser();
  return NextResponse.json(listDocuments(getDb(), user.id));
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = createDocSchema.parse(await req.json().catch(() => ({})));
  const doc = createDocument(getDb(), user.id, body);
  return NextResponse.json(doc, { status: 201 });
});
