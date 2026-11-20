import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listShares, revokeShare, shareDocument } from "@/lib/documents";
import { handle } from "@/lib/errors";
import { shareSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json({ shares: listShares(getDb(), id, user.id) });
});

/** Grant (or change) access by email. Re-sharing with a new role updates the role. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { email, role } = shareSchema.parse(await req.json());
  const share = shareDocument(getDb(), id, user.id, email, role);
  return NextResponse.json(share, { status: 201 });
});

const revokeSchema = z.object({ userId: z.string().min(1) });

export const DELETE = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { userId } = revokeSchema.parse(await req.json());
  revokeShare(getDb(), id, user.id, userId);
  return NextResponse.json({ ok: true });
});
