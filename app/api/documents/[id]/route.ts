import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { deleteDocument, getDocument, updateDocument } from "@/lib/documents";
import { AppError, handle } from "@/lib/errors";
import { updateDocSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json(getDocument(getDb(), id, user.id));
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const body = await req.json().catch(() => {
    throw new AppError(400, "Invalid JSON body");
  });
  const patch = updateDocSchema.parse(body);
  return NextResponse.json(updateDocument(getDb(), id, user.id, patch));
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  deleteDocument(getDb(), id, user.id);
  return NextResponse.json({ ok: true });
});
