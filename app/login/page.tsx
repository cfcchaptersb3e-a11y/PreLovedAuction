import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in — CFC SB3E Auction" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 md:p-8">
        <h1 className="text-2xl font-bold">Sign in to bid</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your email and we&rsquo;ll send you a one-time sign-in link. No password to
          remember, and we only use your address to confirm bids and let you know if you win.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
      <p className="mt-4 px-2 text-xs text-muted">
        First time here? The same form creates your account — just enter your email.
      </p>
    </div>
  );
}
