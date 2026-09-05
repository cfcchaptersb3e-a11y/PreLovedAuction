import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { emailStatus } from "@/lib/email";

const TABS = [
  { href: "/admin", label: "Auctions" },
  { href: "/admin/winners", label: "Winners & payments" },
  { href: "/admin/people", label: "People" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const email = emailStatus();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <div className="mr-auto">
          <h1 className="text-xl font-bold">Organiser tools</h1>
          <p className="text-sm text-muted">Signed in as {user.email}</p>
        </div>
        <nav className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-parchment hover:text-ink"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {!email.configured && (
        <p className="rounded-xl border border-clay/40 bg-clay-light p-4 text-sm text-ink">
          <strong className="font-semibold">Emails are not being sent.</strong> No email service is
          configured, so nobody can receive a sign-in link and bidders can&rsquo;t get in. Sign-in
          links are written to the server log instead. Set <code>RESEND_API_KEY</code> in the
          deployment settings before opening an auction.
        </p>
      )}

      {email.configured && email.usingTestSender && (
        <p className="rounded-xl border border-gold/40 bg-clay-light p-4 text-sm text-ink">
          <strong className="font-semibold">Email is in testing mode.</strong> Messages are sent from
          Resend&rsquo;s shared address, which only delivers to the account owner&rsquo;s own inbox —
          your bidders will receive nothing. Verify a sending domain in Resend and set{" "}
          <code>EMAIL_FROM</code> to an address at that domain before inviting anyone.
        </p>
      )}

      {children}
    </div>
  );
}
