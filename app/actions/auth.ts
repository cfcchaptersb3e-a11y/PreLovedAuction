"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  LOCKOUT_MESSAGE,
  accountExists,
  consumePasswordResetToken,
  createAccount,
  createPasswordResetToken,
  endSession,
  normaliseEmail,
  passwordProblem,
  requireUser,
  signInWithPassword,
  startSession,
} from "@/lib/auth";
import { EmailError, sendPasswordResetLink, sendWelcomeEmail } from "@/lib/email";

export type FormState = { error?: string; message?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// ------------------------------------------------------------------ sign in

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = normaliseEmail(field(formData, "email"));
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_PATTERN.test(email) || !password) {
    return { error: "Please enter your email address and password." };
  }

  const result = await signInWithPassword(email, password);

  if (!result.ok) {
    if (result.reason === "locked") return { error: LOCKOUT_MESSAGE };
    if (result.reason === "no-password") {
      return {
        error:
          "This account doesn't have a password yet. Use “Forgot your password?” below to set one.",
      };
    }
    // Deliberately identical for a wrong address and a wrong password.
    return { error: "That email address and password don't match." };
  }

  await startSession(result.user.id);
  redirect(result.user.role === "ADMIN" ? "/admin" : "/");
}

// ------------------------------------------------------------------ sign up

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = normaliseEmail(field(formData, "email"));
  const password = String(formData.get("password") ?? "");
  const name = field(formData, "name");
  const phone = field(formData, "phone");

  if (!EMAIL_PATTERN.test(email)) return { error: "Please enter a valid email address." };
  if (!name) return { error: "Please enter your name, so organisers know who you are." };

  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== String(formData.get("confirm") ?? "")) {
    return { error: "The two passwords don't match." };
  }

  const user = await createAccount({ email, password, name, phone });
  if (!user) {
    return {
      error: "There's already an account with that email address. Try signing in instead.",
    };
  }

  // A welcome email is a nicety; never block sign-up on it.
  try {
    await sendWelcomeEmail({ to: user.email, name: user.name });
  } catch (error) {
    console.error("Welcome email failed:", error);
  }

  await startSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin" : "/");
}

// ----------------------------------------------------------- password reset

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = normaliseEmail(field(formData, "email"));
  if (!EMAIL_PATTERN.test(email)) return { error: "Please enter a valid email address." };

  // Always the same answer, so this can't be used to discover who has an account.
  const sameAnswer = {
    message: `If ${email} has an account, we've sent it a link to set a new password. It expires in an hour.`,
  };

  if (!(await accountExists(email))) return sameAnswer;

  try {
    const token = await createPasswordResetToken(email);
    await sendPasswordResetLink(email, token);
  } catch (error) {
    console.error("Password reset email failed:", error);
    if (error instanceof EmailError) {
      return {
        error:
          "We couldn't send the reset link — the auction's email isn't working right now. Please tell a chapter organiser.",
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
  redirect(user.role === "ADMIN" ? "/admin" : "/");
}

// -------------------------------------------------------------------- other

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = field(formData, "name");
  const phone = field(formData, "phone");

  if (name.length > 80) return { error: "That name is a bit too long." };
  if (phone.length > 40) return { error: "That contact number is a bit too long." };

  await db.user.update({
    where: { id: user.id },
    data: { name: name || null, phone: phone || null },
  });
  revalidatePath("/account");
  return { message: "Your details have been saved." };
}
