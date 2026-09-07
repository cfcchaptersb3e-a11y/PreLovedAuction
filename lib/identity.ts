/**
 * Who an account belongs to, and how to say so.
 *
 * People can sign up with an email address, a mobile number, or both, and sign
 * in with whichever they gave. This module is the one place that decides what
 * counts as each, so the sign-up form, the sign-in form and the server all
 * agree — a number typed one way must not create an account that the same
 * number typed another way can't reach.
 *
 * Deliberately free of any server import so the forms can use it too.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Philippine mobile numbers as the chapter writes them: 09 and nine digits. */
export const MOBILE_PATTERN = /^09\d{9}$/;

export const MOBILE_FORMAT_HINT = "09XXXXXXXXX";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Reduces anything that is recognizably a Philippine mobile number to the one
 * form we store, or returns null. "0917 123 4567", "+63 917 123 4567",
 * "63-917-123-4567" and "9171234567" are all the same person.
 */
export function normalizeMobile(raw: string): string | null {
  const digits = raw.replace(/[\s().–—-]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;

  let local = digits;
  if (local.startsWith("63") && local.length === 12) local = `0${local.slice(2)}`;
  else if (local.startsWith("9") && local.length === 10) local = `0${local}`;

  return MOBILE_PATTERN.test(local) ? local : null;
}

/** A message explaining why a number was not accepted, or null if it is fine. */
export function mobileProblem(raw: string): string | null {
  if (!raw.trim()) return null;
  return normalizeMobile(raw)
    ? null
    : `Please write your mobile number as ${MOBILE_FORMAT_HINT} — 11 digits starting with 09.`;
}

export type Identifier = { kind: "email"; value: string } | { kind: "mobile"; value: string };

/**
 * Reads whatever someone typed into the single sign-in box. An "@" means they
 * meant an email address, so a mistyped one is reported as a bad address
 * rather than as a bad phone number.
 */
export function identify(raw: string): Identifier | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    const email = normalizeEmail(trimmed);
    return EMAIL_PATTERN.test(email) ? { kind: "email", value: email } : null;
  }

  const mobile = normalizeMobile(trimmed);
  return mobile ? { kind: "mobile", value: mobile } : null;
}

/** 09171234567 → 0917 123 4567, which is how people read it back. */
export function formatMobile(mobile: string): string {
  return MOBILE_PATTERN.test(mobile)
    ? `${mobile.slice(0, 4)} ${mobile.slice(4, 7)} ${mobile.slice(7)}`
    : mobile;
}

type Account = { email?: string | null; mobile?: string | null; phone?: string | null };

/** What organizers see: the address if there is one, otherwise the number. */
export function accountHandle(user: Account): string {
  if (user.email) return user.email;
  if (user.mobile) return formatMobile(user.mobile);
  return "—";
}

/** The number to ring about payment or pickup. */
export function contactNumber(user: Account): string | null {
  if (user.mobile) return formatMobile(user.mobile);
  return user.phone?.trim() || null;
}

/**
 * A stand-in shown to other bidders when someone has not given a name. Neither
 * a full address nor a full number is ever public, so both are cut down to
 * something recognizable only to its owner.
 */
export function maskedHandle(user: Account): string {
  if (user.email) {
    const handle = user.email.split("@")[0];
    return `${handle.slice(0, 2)}${"•".repeat(Math.max(3, handle.length - 2))}`;
  }
  if (user.mobile) return `••• ${user.mobile.slice(-4)}`;
  return "A bidder";
}

/** First name and last initial, the way bidders appear to each other. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

/** How a bidder is shown publicly: their short name, or a masked handle. */
export function bidderName(user: Account & { name?: string | null }): string {
  return user.name?.trim() ? shortName(user.name) : maskedHandle(user);
}
