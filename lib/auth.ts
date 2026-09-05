import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Role, User } from "@prisma/client";

const SESSION_COOKIE = "pla_session";
const SESSION_DAYS = 30;
const LOGIN_TOKEN_MINUTES = 20;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set it to a random string of at least 16 characters."
    );
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Session cookie value: `<userId>.<expiryMs>.<hmac>` */
function createSessionValue(userId: string): { value: string; expires: Date } {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const payload = `${userId}.${expires.getTime()}`;
  return { value: `${payload}.${sign(payload)}`, expires };
}

function readSessionValue(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiryRaw, signature] = parts;
  const expected = sign(`${userId}.${expiryRaw}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!Number(expiryRaw) || Number(expiryRaw) < Date.now()) return null;
  return userId;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isConfiguredAdmin(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => normaliseEmail(entry))
    .filter(Boolean);
  return list.includes(normaliseEmail(email));
}

/**
 * Issues a single-use login token. Only the SHA-256 hash is stored, so a leak
 * of the database does not hand anyone a working login link.
 */
export async function createLoginToken(email: string): Promise<string> {
  const address = normaliseEmail(email);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // One live link per address keeps old links from piling up.
  await db.loginToken.deleteMany({ where: { email: address } });
  await db.loginToken.create({
    data: {
      email: address,
      tokenHash,
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60 * 1000),
    },
  });
  return token;
}

export async function consumeLoginToken(token: string): Promise<User | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await db.loginToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  await db.loginToken.delete({ where: { id: record.id } });

  const role: Role = isConfiguredAdmin(record.email) ? "ADMIN" : "BIDDER";
  const existing = await db.user.findUnique({ where: { email: record.email } });
  if (existing) {
    // Promote (never demote) so an organiser added to ADMIN_EMAILS later still
    // gets access, but an admin granted in the UI is not wiped out.
    if (role === "ADMIN" && existing.role !== "ADMIN") {
      return db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    }
    return existing;
  }
  return db.user.create({ data: { email: record.email, role } });
}

export async function startSession(userId: string): Promise<void> {
  const { value, expires } = createSessionValue(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Memoised for the lifetime of one request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const userId = readSessionValue(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You need to be signed in to do that.");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Only chapter admins can do that.");
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN";
}
