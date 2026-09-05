import Link from "next/link";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/AuthForms";
import { AuthMasthead } from "@/components/AuthMasthead";

export const metadata: Metadata = { title: "Set a new password — CFC SB3E Auction" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">That link is incomplete</h1>
        <p className="mt-2 text-muted">
          The reset link seems to be missing part of its address. Please request a new one.
        </p>
        <Link href="/forgot-password" className="btn-primary mt-5">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <AuthMasthead />
      <div className="card p-6 md:p-8">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted">
          Choose a new password and you&rsquo;ll be signed in straight away.
        </p>
        <div className="mt-6">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  );
}
