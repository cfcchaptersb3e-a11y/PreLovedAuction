import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { MEMBER_FAQ } from "@/lib/faq";
import { Faq, FaqContents } from "@/components/Faq";

export const metadata: Metadata = {
  title: "Questions — CFC SB3E Auction",
  description: "How to join the auction, how bidding works, and what happens on live auction night.",
};

export default async function FaqPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Questions</h1>
        <p className="mt-2 max-w-prose text-muted">
          Everything about joining the auction, bidding, and the live auction night. If what
          you need is not here, ask a chapter organizer &mdash; that is what we are here for.
        </p>
      </div>

      <FaqContents sections={MEMBER_FAQ} />

      <Faq sections={MEMBER_FAQ} />

      {user && isStaff(user.role) && (
        <p className="card p-4 text-sm text-muted">
          Helping run the auction?{" "}
          <Link href="/admin/help" className="font-medium text-forest hover:underline">
            There is a separate page for your role
          </Link>{" "}
          in the organizer tools.
        </p>
      )}
    </div>
  );
}
