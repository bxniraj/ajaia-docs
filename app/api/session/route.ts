import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getUser } from "@/lib/documents";
import { AppError, handle } from "@/lib/errors";

export const runtime = "nodejs";

const loginSchema = z.object({ userId: z.string().min(1, "Choose a user") });

/** Sign in as a seeded user (mocked auth, no password). */
export const POST = handle(async (req: Request) => {
  const { userId } = loginSchema.parse(await req.json());
  const user = getUser(getDb(), userId);
  if (!user) throw new AppError(404, "Unknown user");

  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, signSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
});

export const DELETE = handle(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
