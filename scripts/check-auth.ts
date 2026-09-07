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
import { approveResetRequest, dismissResetRequest, requestResetHelp } from "@/lib/auth";
import { identify, normalizeMobile, mobileProblem, formatMobile } from "@/lib/identity";
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
  const made = await createAccount({ email, password: "auction2026", name: "Maria Santos" });
  const user = made.ok ? made.user : null;
  check("account created", user?.email === email);
  check("password is stored hashed, never in clear",
    Boolean(user?.passwordHash) && !user!.passwordHash!.includes("auction2026"));
  const dupe = await createAccount({ email, password: "another", name: "Imposter" });
  check("duplicate email refused", !dupe.ok && dupe.reason === "email-taken");
  const upper = await createAccount({ email: email.toUpperCase(), password: "x2", name: "Y" });
  check("email is normalized", !upper.ok && upper.reason === "email-taken");
  const nothing = await createAccount({ password: "x2345678", name: "Nameless" });
  check("an account with neither address nor number is refused",
    !nothing.ok && nothing.reason === "no-identifier");

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
  const token = await createPasswordResetToken(user!);
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

  const expired = await createPasswordResetToken(user!);
  await db.loginToken.updateMany({ where: { email }, data: { expiresAt: new Date(Date.now() - 1000) } });
  check("expired token rejected",
    (await consumePasswordResetToken(expired, "x1234567")) === null);

  // --- reset unlocks a locked account ---
  await db.user.update({ where: { email }, data: { failedLogins: 9, lockedUntil: new Date(Date.now() + 900000) } });
  const t2 = await createPasswordResetToken(user!);
  await consumePasswordResetToken(t2, "unlocked123");
  check("resetting a password clears a lockout", (await signInWithPassword(email, "unlocked123")).ok);

  // --- accounts without a password (pre-existing users) ---
  const legacyEmail = `legacy-${suffix}@example.com`;
  const legacyUser = await db.user.create({ data: { email: legacyEmail, name: "Old Account" } });
  const legacy = await signInWithPassword(legacyEmail, "anything");
  check("an account with no password is told to reset",
    !legacy.ok && legacy.reason === "no-password");
  const lt = await createPasswordResetToken(legacyUser);
  await consumePasswordResetToken(lt, "nowihaveone");
  check("and can set one through the reset flow",
    (await signInWithPassword(legacyEmail, "nowihaveone")).ok);

  check("accountExists is case-insensitive", await accountExists(email.toUpperCase()));
  check("accountExists is false for strangers", !(await accountExists(`nobody-${suffix}@example.com`)));

  // --- mobile numbers as a way in -----------------------------------------
  check("a plain number is accepted", normalizeMobile("09171234567") === "09171234567");
  check("spaces and dashes are ignored", normalizeMobile("0917 123-4567") === "09171234567");
  check("+63 is the same number", normalizeMobile("+63 917 123 4567") === "09171234567");
  check("63 without the plus too", normalizeMobile("639171234567") === "09171234567");
  check("a leading 9 is assumed to be a mobile", normalizeMobile("9171234567") === "09171234567");
  check("a landline is refused", normalizeMobile("028123456") === null);
  check("too many digits refused", normalizeMobile("091712345678") === null);
  check("letters refused", normalizeMobile("0917ABC4567") === null);
  check("an empty number is not a problem", mobileProblem("") === null);
  check("a bad number explains itself", (mobileProblem("12345") ?? "").includes("09"));
  check("a number reads back in groups", formatMobile("09171234567") === "0917 123 4567");

  check("an address is read as an address", identify("Someone@Example.com")?.kind === "email");
  check("a number is read as a number", identify("0917 123 4567")?.kind === "mobile");
  check("a mistyped address is not read as a number", identify("someone@") === null);
  check("nonsense is neither", identify("hello") === null);

  const mobile = `0917${String(suffix).slice(-7)}`;
  const byNumber = await createAccount({ mobile, password: "numberonly1", name: "Nena Cruz" });
  check("an account can be made with a number alone", byNumber.ok);
  check("and has no email address", byNumber.ok && byNumber.user.email === null);
  check("signing in with that number works", (await signInWithPassword(mobile, "numberonly1")).ok);
  check("the number signs in however it is typed",
    (await signInWithPassword(formatMobile(mobile), "numberonly1")).ok);
  check("and with the country code",
    (await signInWithPassword(`+63${mobile.slice(1)}`, "numberonly1")).ok);
  check("the wrong password still fails", !(await signInWithPassword(mobile, "wrong")).ok);
  const dupeNumber = await createAccount({ mobile, password: "another1", name: "Imposter" });
  check("a number can't be claimed twice", !dupeNumber.ok && dupeNumber.reason === "mobile-taken");
  const spacedDupe = await createAccount({
    mobile: formatMobile(mobile), password: "another1", name: "Imposter",
  });
  check("nor by typing it differently", !spacedDupe.ok && spacedDupe.reason === "mobile-taken");

  // The organizer's reset link is the only way back in for this account.
  const numberToken = await createPasswordResetToken(byNumber.ok ? byNumber.user : { id: "", email: null });
  check("a number-only account can still be given a reset link",
    (await consumePasswordResetToken(numberToken, "freshpass1")) !== null);
  check("and the new password works", (await signInWithPassword(mobile, "freshpass1")).ok);

  // The application check above is the polite one; the database must refuse a
  // duplicate too, or a racing signup could put two accounts on one number.
  let indexHeld = false;
  try {
    await db.user.create({ data: { mobile, name: "Racer", passwordHash: null } });
  } catch {
    indexHeld = true;
  }
  check("the database refuses a second account on the same number", indexHeld);

  // --- asking an organizer for help getting back in -----------------------
  const helpEmail = `help-${suffix}@example.com`;
  await requestResetHelp({ mobile: formatMobile(mobile), email: helpEmail });
  let request = await db.passwordResetRequest.findFirst({ where: { mobile } });
  check("a request is recorded against the account",
    Boolean(request) && request!.userId === (byNumber.ok ? byNumber.user.id : null));
  check("the number is stored normalized", request!.mobile === mobile);
  check("nothing is sent yet", request!.status === "PENDING");

  await requestResetHelp({ mobile, email: `second-${suffix}@example.com` });
  const open = await db.passwordResetRequest.findMany({ where: { mobile, status: "PENDING" } });
  check("asking twice leaves one request, with the later address",
    open.length === 1 && open[0].email === `second-${suffix}@example.com`);

  await requestResetHelp({ mobile: `0999${String(suffix).slice(-7)}`, email: helpEmail });
  const orphan = await db.passwordResetRequest.findFirst({
    where: { mobile: `0999${String(suffix).slice(-7)}` },
  });
  check("a request for an unknown number is still recorded", Boolean(orphan));
  check("and is marked as matching no account", orphan!.userId === null);
  const refused = await approveResetRequest(orphan!.id, "organizer");
  check("approving it does nothing", !refused.ok && refused.reason === "no-account");

  // The address must not be one somebody else is already signing in with.
  await db.passwordResetRequest.updateMany({
    where: { mobile }, data: { email: email },
  });
  const clash = await approveResetRequest(open[0].id, "organizer");
  check("an address another account uses is refused",
    !clash.ok && clash.reason === "email-taken");

  await db.passwordResetRequest.updateMany({ where: { mobile }, data: { email: helpEmail } });
  const approved = await approveResetRequest(open[0].id, "organizer");
  check("approving issues a token", approved.ok && Boolean(approved.token));
  check("and puts the address on the account", approved.ok && approved.user.email === helpEmail);
  check("the token sets a new password",
    approved.ok && (await consumePasswordResetToken(approved.token, "afterhelp1")) !== null);
  check("which signs them in by number", (await signInWithPassword(mobile, "afterhelp1")).ok);
  check("and now by address too", (await signInWithPassword(helpEmail, "afterhelp1")).ok);
  const twice = await approveResetRequest(open[0].id, "organizer");
  check("a request can't be approved twice", !twice.ok && twice.reason === "gone");

  await requestResetHelp({ mobile, email: `later-${suffix}@example.com` });
  const toDismiss = await db.passwordResetRequest.findFirst({ where: { mobile, status: "PENDING" } });
  await dismissResetRequest(toDismiss!.id, "organizer");
  const dismissed = await db.passwordResetRequest.findUnique({ where: { id: toDismiss!.id } });
  check("dismissing closes it", dismissed?.status === "DISMISSED");
  check("and it cannot then be approved",
    !(await approveResetRequest(toDismiss!.id, "organizer")).ok);

  const both = await createAccount({
    email: `both-${suffix}@example.com`, mobile: `0918${String(suffix).slice(-7)}`,
    password: "eitherway1", name: "Tess Reyes",
  });
  check("an account can have both", both.ok);
  check("signing in by address works", (await signInWithPassword(`both-${suffix}@example.com`, "eitherway1")).ok);
  check("signing in by number works too",
    (await signInWithPassword(`0918${String(suffix).slice(-7)}`, "eitherway1")).ok);

  await db.passwordResetRequest.deleteMany({
    where: { mobile: { in: [mobile, `0999${String(suffix).slice(-7)}`] } },
  });
  await db.user.deleteMany({ where: { email: { contains: `-${suffix}@example.com` } } });
  await db.user.deleteMany({ where: { mobile: { in: [mobile, `0918${String(suffix).slice(-7)}`] } } });
  await db.$disconnect();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failed.`);
  process.exit(failures ? 1 : 0);
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
