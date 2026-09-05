import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignUpForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create an account — CFC SB3E Auction" };

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6 md:p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-muted">
          You only need an account to place bids — browsing is open to everyone. We use your email
          to tell you if you&rsquo;ve been outbid or have won.
        </p>
        <div className="mt-6">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}
