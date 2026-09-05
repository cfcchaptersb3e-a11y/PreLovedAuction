import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS, can, isStaff } from "@/lib/permissions";
import { emailStatus } from "@/lib/email";

const TABS = [
  { href: "/admin", label: "Auctions", capability: "items" as const },
  { href: "/admin/winners", label: "Winners & payments", capability: "payments" as const },
  { href: "/admin/people", label: "People", capability: "people" as const },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/");

  const tabs = TABS.filter((tab) => can(user.role, tab.capability));
  // Only organizers set up the email service, so only they need telling.
  const email = can(user.role, "events") ? emailStatus() : { configured: true, warning: null };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <div className="mr-auto">
          <h1 className="text-xl font-bold">Organizer tools</h1>
          <p className="text-sm text-muted">
            Signed in as {user.email} ·{" "}
            <span className="font-medium text-ink">{ROLE_LABELS[user.role]}</span>
          </p>
        </div>
        <nav className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
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

      {email.warning && (
        <p
          className={`rounded-xl border p-4 text-sm text-ink ${
            email.configured ? "border-gold/40" : "border-clay/40"
          } bg-clay-light`}
        >
          <strong className="font-semibold">
            {email.configured ? "Email needs attention." : "Emails are not being sent."}
          </strong>{" "}
          {email.warning}
        </p>
      )}

      {children}
    </div>
  );
}
