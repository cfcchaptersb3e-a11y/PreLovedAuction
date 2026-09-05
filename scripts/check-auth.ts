/**
 * Checks the password rules against a real database: hashing, sign-in,
 * lockout after repeated failures, and single-use password resets.
 *
 * Run against a scratch database with:  npm run check:auth
 * It creates its own test accounts and deletes them afterwards.
 */
import {
  createAccount, signInWithPassword, hashPassword, verifyPassword,
  createPasswordResetToken, consumePasswordResetToken, passwordProblem, accountExists,
} from "@/lib/auth";
import { db } from "@/lib/db";

let failures = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
  if (!ok) failures++;
};

async function main() {
  const suffix = Date.now();
  const email = `member-${suffix}@example.com`;
  await db.user.deleteMany({ where: { email: { contains: `-${suffix}@example.com` } } });

  // --- hashing ---
  const hash = await hashPassword("correct horse battery");
  check("hash is not the password", !hash.includes("correct horse battery"));
  check("hash is salted per call", (await hashPassword("same")) !== (await hashPassword("same")));
  check("correct password verifies", await verifyPassword("correct horse battery", hash));
  check("wrong password rejected", !(await verifyPassword("wrong", hash)));
  check("malformed hash rejected", !(await verifyPassword("x", "not-a-hash")));
  check("empty stored hash rejected", !(await verifyPassword("x", "scrypt$16384$c2FsdA==$")));

  // --- password rules ---
  check("short password refused", passwordProblem("abc") !== null);
  check("8 characters accepted", passwordProblem("abcdefgh") === null);

  // --- accounts ---
  const user = await createAccount({ email, password: "auction2026", name: "Maria Santos" });
  check("account created", user?.email === email);
  check("password is stored hashed, never in clear",
    Boolean(user?.passwordHash) && !user!.passwordHash!.includes("auction2026"));
  check("duplicate email refused",
    (await createAccount({ email, password: "another", name: "Imposter" })) === null);
  check("email is normalized",
    (await createAccount({ email: email.toUpperCase(), password: "x2", name: "Y" })) === null);

  // --- sign in ---
  check("correct credentials sign in", (await signInWithPassword(email, "auction2026")).ok);
  const wrongPass = await signInWithPassword(email, "nope");
  check("wrong password refused", !wrongPass.ok && wrongPass.reason === "invalid");
  const noAccount = await signInWithPassword(`ghost-${suffix}@example.com`, "whatever");
  check("unknown address gives the same answer as a wrong password",
    !noAccount.ok && noAccount.reason === "invalid");
  check("uppercase email still signs in", (await signInWithPassword(email.toUpperCase(), "auction2026")).ok);

  // --- lockout ---
  for (let i = 0; i < 7; i++) await signInWithPassword(email, "bad");
  const eighth = await signInWithPassword(email, "bad");
  check("locks out after repeated failures", !eighth.ok && eighth.reason === "locked");
  const lockedOutEvenIfRight = await signInWithPassword(email, "auction2026");
  check("lockout holds even with the right password",
    !lockedOutEvenIfRight.ok && lockedOutEvenIfRight.reason === "locked");

  await db.user.update({ where: { email }, data: { failedLogins: 0, lockedUntil: null } });
  check("unlock restores access", (await signInWithPassword(email, "auction2026")).ok);
  check("failure count reset after success",
    (await db.user.findUnique({ where: { email } }))?.failedLogins === 0);

  // --- reset ---
  const token = await createPasswordResetToken(email);
  const stored = await db.loginToken.findFirst({ where: { email } });
  check("only the token hash is stored",
    Boolean(stored) && stored!.tokenHash !== token && !stored!.tokenHash.includes(token));

  const reset = await consumePasswordResetToken(token, "brandnewpass");
  check("reset sets the new password", reset !== null);
  check("new password works", (await signInWithPassword(email, "brandnewpass")).ok);
  check("old password no longer works", !(await signInWithPassword(email, "auction2026")).ok);
  check("reset token is single use",
    (await consumePasswordResetToken(token, "again123")) === null);
  check("forged token rejected",
    (await consumePasswordResetToken("made-up-token", "x1234567")) === null);

  const expired = await createPasswordResetToken(email);
  await db.loginToken.updateMany({ where: { email }, data: { expiresAt: new Date(Date.now() - 1000) } });
  check("expired token rejected",
    (await consumePasswordResetToken(expired, "x1234567")) === null);

  // --- reset unlocks a locked account ---
  await db.user.update({ where: { email }, data: { failedLogins: 9, lockedUntil: new Date(Date.now() + 900000) } });
  const t2 = await createPasswordResetToken(email);
  await consumePasswordResetToken(t2, "unlocked123");
  check("resetting a password clears a lockout", (await signInWithPassword(email, "unlocked123")).ok);

  // --- accounts without a password (pre-existing users) ---
  const legacyEmail = `legacy-${suffix}@example.com`;
  await db.user.create({ data: { email: legacyEmail, name: "Old Account" } });
  const legacy = await signInWithPassword(legacyEmail, "anything");
  check("an account with no password is told to reset",
    !legacy.ok && legacy.reason === "no-password");
  const lt = await createPasswordResetToken(legacyEmail);
  await consumePasswordResetToken(lt, "nowihaveone");
  check("and can set one through the reset flow",
    (await signInWithPassword(legacyEmail, "nowihaveone")).ok);

  check("accountExists is case-insensitive", await accountExists(email.toUpperCase()));
  check("accountExists is false for strangers", !(await accountExists(`nobody-${suffix}@example.com`)));

  await db.user.deleteMany({ where: { email: { contains: `-${suffix}@example.com` } } });
  await db.$disconnect();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failed.`);
  process.exit(failures ? 1 : 0);
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
