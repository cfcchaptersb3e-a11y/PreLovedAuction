import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignInForm } from "@/components/AuthForms";
import { AuthMasthead } from "@/components/AuthMasthead";

export const metadata: Metadata = { title: "Sign in — CFC SB3E Auction" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="mx-auto max-w-md">
      <AuthMasthead />
      <div className="card p-6 md:p-8">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Welcome back. Sign in to place bids and follow the items you&rsquo;re watching.
        </p>
        <div className="mt-6">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
