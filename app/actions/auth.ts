"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createLoginToken, endSession, normaliseEmail, requireUser } from "@/lib/auth";
import { EmailError, sendLoginLink } from "@/lib/email";

export type FormState = { error?: string; message?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function requestLoginLink(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  try {
    const token = await createLoginToken(email);
    await sendLoginLink(email, token);
  } catch (error) {
    console.error("Login link failed:", error);
    if (error instanceof EmailError) {
      // Say the link did not arrive, rather than showing "check your inbox"
      // for a message that is never coming.
      return {
        error:
          "We couldn't send your sign-in link — the auction's email isn't working right now. Please tell a chapter organiser so they can fix it.",
      };
    }
    return { error: "We couldn't send the link just now. Please try again in a moment." };
  }

  return {
    message: `We've sent a sign-in link to ${email}. It expires in 20 minutes — check your spam folder if it doesn't arrive.`,
  };
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (name.length > 80) return { error: "That name is a bit too long." };
  if (phone.length > 40) return { error: "That contact number is a bit too long." };

  await db.user.update({
    where: { id: user.id },
    data: { name: name || null, phone: phone || null },
  });
  revalidatePath("/account");
  return { message: "Your details have been saved." };
}
