import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { requireStaffPage } from "@/lib/page-guards";
import { ROLE_LABELS } from "@/lib/permissions";
import { HELPER_FAQ } from "@/lib/faq";
import { Faq, FaqContents } from "@/components/Faq";

export const metadata: Metadata = { title: "Help — CFC SB3E Auction" };
export const dynamic = "force-dynamic";

/** Which section belongs to which role, so a helper's own is put first. */
const SECTION_FOR_ROLE: Record<string, string> = {
  CATALOGUER: "cataloger",
  TREASURER: "treasurer",
  ADMIN: "organizer",
};

export default async function HelperHelpPage() {
  await requireStaffPage();
  const user = await getCurrentUser();

  // Everyone helping sees every section — people cover for each other — but
  // the one for your own role comes first so you are not hunting for it.
  const mine = user ? SECTION_FOR_ROLE[user.role] : undefined;
  const sections = mine
    ? [...HELPER_FAQ].sort((a, b) => Number(b.id === mine) - Number(a.id === mine))
    : HELPER_FAQ;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold">Help for helpers</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          How each job is done, and what each role can and cannot reach. Only people helping to
          run the auction can see this page.
          {user && (
            <>
              {" "}
              You are a{" "}
              <span className="font-medium text-ink">{ROLE_LABELS[user.role]}</span>, so that
              section is first.
            </>
          )}
        </p>
      </div>

      <FaqContents sections={sections} />

      <Faq sections={sections} />

      <p className="card p-4 text-sm text-muted">
        Looking for what the members see?{" "}
        <Link href="/faq" className="font-medium text-forest hover:underline">
          The questions page
        </Link>{" "}
        covers signing up, bidding and the live auction night.
      </p>
    </div>
  );
}
