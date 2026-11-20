import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
const { signSession, verifySession } = await import("@/lib/auth");

describe("session cookie", () => {
  it("round-trips a signed user id", () => {
    expect(verifySession(signSession("u_alice"))).toBe("u_alice");
  });

  it("rejects a tampered or unsigned cookie", () => {
    const forged = signSession("u_alice").replace("u_alice", "u_bob");
    expect(verifySession(forged)).toBeNull();
    expect(verifySession("u_bob")).toBeNull();
    expect(verifySession(undefined)).toBeNull();
  });
});
