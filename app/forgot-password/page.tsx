import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/AuthForms";
import { AuthMasthead } from "@/components/AuthMasthead";

export const metadata: Metadata = { title: "Forgot your password — CFC SB3E Auction" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <AuthMasthead />
      <div className="card p-6 md:p-8">
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your email address and we&rsquo;ll send you a link to set a new one.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
