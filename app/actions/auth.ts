"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  LOCKOUT_MESSAGE,
  accountForEmail,
  consumePasswordResetToken,
  createAccount,
  createPasswordResetToken,
  endSession,
  passwordProblem,
  requireUser,
  signInWithPassword,
  startSession,
} from "@/lib/auth";
import {
  EMAIL_PATTERN,
  MOBILE_FORMAT_HINT,
  identify,
  mobileProblem,
  normalizeEmail,
  normalizeMobile,
} from "@/lib/identity";
import { EmailError, sendPasswordResetLink, sendWelcomeEmail } from "@/lib/email";
import { staffLandingPath } from "@/lib/permissions";

export type FormState = { error?: string; message?: string };

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// ------------------------------------------------------------------ sign in

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifierRaw = field(formData, "identifier");
  const password = String(formData.get("password") ?? "");

  if (!identifierRaw || !password) {
    return { error: "Please enter your email address or mobile number, and your password." };
  }
  if (!identify(identifierRaw)) {
    return {
      error: `That doesn't look like an email address or a mobile number. Numbers go in as ${MOBILE_FORMAT_HINT}.`,
    };
  }

  const result = await signInWithPassword(identifierRaw, password);

  if (!result.ok) {
    if (result.reason === "locked") return { error: LOCKOUT_MESSAGE };
    if (result.reason === "no-password") {
      return {
        error:
          "This account doesn't have a password yet. Use “Forgot your password?” below to set one.",
      };
    }
    // Deliberately identical for an unknown account and a wrong password.
    return { error: "Those sign-in details don't match. Please check and try again." };
  }

  await startSession(result.user.id);
  redirect(staffLandingPath(result.user.role));
}

// ------------------------------------------------------------------ sign up

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const emailRaw = field(formData, "email");
  const mobileRaw = field(formData, "mobile");
  const password = String(formData.get("password") ?? "");
  const name = field(formData, "name");

  if (!name) return { error: "Please enter your name, so organizers know who you are." };

  if (!emailRaw && !mobileRaw) {
    return {
      error: "Please give an email address or a mobile number — you'll sign in with it.",
    };
  }

  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (email && !EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const numberProblem = mobileProblem(mobileRaw);
  if (numberProblem) return { error: numberProblem };
  const mobile = mobileRaw ? normalizeMobile(mobileRaw) : null;

  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== String(formData.get("confirm") ?? "")) {
    return { error: "The two passwords don't match." };
  }

  const result = await createAccount({ email, mobile, password, name });
  if (!result.ok) {
    if (result.reason === "email-taken") {
      return {
        error: "There's already an account with that email address. Try signing in instead.",
      };
    }
    if (result.reason === "mobile-taken") {
      return {
        error: "There's already an account with that mobile number. Try signing in instead.",
      };
    }
    return { error: "Please give an email address or a mobile number." };
  }

  // A welcome email is a nicety; never block sign-up on it, and an account
  // with only a mobile number has nowhere to send one.
  if (result.user.email) {
    try {
      await sendWelcomeEmail({ to: result.user.email, name: result.user.name });
    } catch (error) {
      console.error("Welcome email failed:", error);
    }
  }

  await startSession(result.user.id);
  redirect(staffLandingPath(result.user.role));
}

// ----------------------------------------------------------- password reset

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = field(formData, "email");

  // Somebody who signed up with a number only has nowhere for a link to go,
  // so say what to do instead of pretending one was sent.
  if (!raw.includes("@") && normalizeMobile(raw)) {
    return {
      error:
        "Reset links are sent by email, and this is a mobile number. Ask a chapter organizer to reset your password for you.",
    };
  }

  const email = normalizeEmail(raw);
  if (!EMAIL_PATTERN.test(email)) return { error: "Please enter a valid email address." };

  // Always the same answer, so this can't be used to discover who has an account.
  const sameAnswer = {
    message: `If ${email} has an account, we've sent it a link to set a new password. It expires in an hour.`,
  };

  const account = await accountForEmail(email);
  if (!account) return sameAnswer;

  try {
    const token = await createPasswordResetToken(account);
    await sendPasswordResetLink(email, token);
  } catch (error) {
    console.error("Password reset email failed:", error);
    if (error instanceof EmailError) {
      return {
        error:
          "We couldn't send the reset link — the auction's email isn't working right now. Please tell a chapter organizer.",
      };
    }
    return { error: "We couldn't send the link just now. Please try again in a moment." };
  }

  return sameAnswer;
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = field(formData, "token");
  const password = String(formData.get("password") ?? "");

  if (!token) return { error: "That reset link is incomplete. Please request a new one." };

  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== String(formData.get("confirm") ?? "")) {
    return { error: "The two passwords don't match." };
  }

  const user = await consumePasswordResetToken(token, password);
  if (!user) {
    return {
      error: "That reset link has expired or has already been used. Please request a new one.",
    };
  }

  await startSession(user.id);
  redirect(staffLandingPath(user.role));
}

// -------------------------------------------------------------------- other

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = field(formData, "name");
  const emailRaw = field(formData, "email");
  const mobileRaw = field(formData, "mobile");

  if (name.length > 80) return { error: "That name is a bit too long." };

  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (email && !EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const numberProblem = mobileProblem(mobileRaw);
  if (numberProblem) return { error: numberProblem };
  const mobile = mobileRaw ? normalizeMobile(mobileRaw) : null;

  // Removing both would lock the person out of their own account.
  if (!email && !mobile) {
    return { error: "Keep at least one of these — it's what you sign in with." };
  }

  if (email && email !== user.email) {
    const taken = await db.user.findUnique({ where: { email } });
    if (taken && taken.id !== user.id) {
      return { error: "Another account already uses that email address." };
    }
  }
  if (mobile && mobile !== user.mobile) {
    const taken = await db.user.findFirst({ where: { mobile } });
    if (taken && taken.id !== user.id) {
      return { error: "Another account already uses that mobile number." };
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: name || null,
      email,
      mobile,
      // The old free-text contact number is replaced the moment a real mobile
      // number is on the account, so organizers only ever see one.
      ...(mobile ? { phone: null } : {}),
    },
  });
  revalidatePath("/account");
  return { message: "Your details have been saved." };
}
