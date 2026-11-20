import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { getUser, type User } from "./documents";
import { AppError } from "./errors";

/**
 * Mocked auth: users pick a seeded account; we store their id in an HMAC-signed
 * cookie so it cannot be edited client-side. There are no passwords by design.
 */
export const SESSION_COOKIE = "ajaia_session";

function secret(): string {
  return process.env.SESSION_SECRET ?? "dev-only-secret-change-me";
}

export function signSession(userId: string): string {
  const mac = crypto.createHmac("sha256", secret()).update(userId).digest("base64url");
  return `${userId}.${mac}`;
}

export function verifySession(value: string | undefined): string | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = value.slice(0, idx);
  const expected = Buffer.from(signSession(userId));
  const given = Buffer.from(value);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return userId;
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = verifySession(jar.get(SESSION_COOKIE)?.value);
  return userId ? getUser(getDb(), userId) : null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(401, "Please sign in");
  return user;
}
