import "server-only";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import type { ScryptOptions } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";
import { can, type Capability } from "@/lib/permissions";

// promisify loses scrypt's options overload, so name the shape we use.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>;

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

// ------------------------------------------------------------------ passwords

/**
 * Passwords are hashed with scrypt, which is deliberately slow and memory-hard,
 * so a stolen database does not hand anyone a list of usable passwords. scrypt
 * ships with Node, so this needs no dependency.
 */
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // 2^14 — the Node default, a good balance on a small server.

export const MIN_PASSWORD_LENGTH = 8;

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Please use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) return "That password is too long.";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST });
  return `scrypt$${SCRYPT_COST}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;

  const cost = Number(parts[1]);
  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  if (!Number.isFinite(cost) || expected.length === 0) return false;

  const derived = await scryptAsync(password, salt, expected.length, { N: cost });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// --------------------------------------------------------- brute-force guard

const MAX_FAILED_LOGINS = 8;
const LOCKOUT_MINUTES = 15;

export type SignInResult =
  | { ok: true; user: User }
  | { ok: false; reason: "invalid" | "locked" | "no-password" };

/**
 * Checks an email and password. Wrong email and wrong password are reported
 * identically, so the form cannot be used to discover who has an account.
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<SignInResult> {
  const address = normaliseEmail(email);
  const user = await db.user.findUnique({ where: { email: address } });

  if (!user) {
    // Spend comparable time so a missing account is not detectable by timing.
    await hashPassword(password);
    return { ok: false, reason: "invalid" };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, reason: "locked" };
  }

  if (!user.passwordHash) return { ok: false, reason: "no-password" };

  if (await verifyPassword(password, user.passwordHash)) {
    if (user.failedLogins > 0 || user.lockedUntil) {
      await db.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null },
      });
    }
    return { ok: true, user };
  }

  const failed = user.failedLogins + 1;
  await db.user.update({
    where: { id: user.id },
    data: {
      failedLogins: failed,
      lockedUntil:
        failed >= MAX_FAILED_LOGINS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null,
    },
  });

  return { ok: false, reason: failed >= MAX_FAILED_LOGINS ? "locked" : "invalid" };
}

export const LOCKOUT_MESSAGE = `Too many attempts. Please wait ${LOCKOUT_MINUTES} minutes and try again, or reset your password.`;

/** Creates an account. Returns null if the address is already registered. */
export async function createAccount(params: {
  email: string;
  password: string;
  name?: string | null;
  phone?: string | null;
}): Promise<User | null> {
  const address = normaliseEmail(params.email);
  if (await db.user.findUnique({ where: { email: address } })) return null;

  return db.user.create({
    data: {
      email: address,
      name: params.name?.trim() || null,
      phone: params.phone?.trim() || null,
      passwordHash: await hashPassword(params.password),
      role: isConfiguredAdmin(address) ? "ADMIN" : "BIDDER",
    },
  });
}

// ---------------------------------------------------------- password resets

const RESET_TOKEN_MINUTES = 60;

/**
 * Issues a single-use reset token. Only its SHA-256 hash is stored, so a leak
 * of the database does not hand anyone a working reset link.
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const address = normaliseEmail(email);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // One live link per address keeps old ones from piling up.
  await db.loginToken.deleteMany({ where: { email: address } });
  await db.loginToken.create({
    data: {
      email: address,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
    },
  });
  return token;
}

/** Spends a reset token and sets the new password. */
export async function consumePasswordResetToken(
  token: string,
  newPassword: string
): Promise<User | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await db.loginToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  const user = await db.user.findUnique({ where: { email: record.email } });
  if (!user) return null;

  await db.loginToken.delete({ where: { id: record.id } });

  return db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      failedLogins: 0,
      lockedUntil: null,
      // Promote an organiser added to ADMIN_EMAILS after they signed up.
      ...(isConfiguredAdmin(user.email) && user.role !== "ADMIN"
        ? { role: "ADMIN" as const }
        : {}),
    },
  });
}

/** True if the address has an account, used only to decide whether to email. */
export async function accountExists(email: string): Promise<boolean> {
  return Boolean(await db.user.findUnique({ where: { email: normaliseEmail(email) } }));
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

/**
 * The guard behind every organiser action. Refuses with wording that names the
 * capability, so someone who has been given the wrong role can say what they
 * were trying to do.
 */
export async function requireCapability(capability: Capability): Promise<User> {
  const user = await requireUser();
  if (!can(user.role, capability)) {
    throw new Error(REFUSALS[capability]);
  }
  return user;
}

const REFUSALS: Record<Capability, string> = {
  events: "Only chapter organisers can change an auction.",
  items: "You need cataloguer access to change items. Ask a chapter organiser.",
  payments: "You need treasurer access to see winners and payments.",
  people: "Only chapter organisers can change what someone is allowed to do.",
};

export async function hasCapability(capability: Capability): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? can(user.role, capability) : false;
}
