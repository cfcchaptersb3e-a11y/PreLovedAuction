import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS, can, isStaff } from "@/lib/permissions";
import { cronWarning, emailStatus } from "@/lib/email";
import { accountHandle } from "@/lib/identity";
import { AdminTabs } from "@/components/admin/AdminTabs";

const TABS = [
  { href: "/admin", label: "Auctions", capability: "items" as const },
  { href: "/admin/live", label: "Live auction", capability: "live" as const },
  { href: "/admin/winners", label: "Winners & payments", capability: "payments" as const },
  { href: "/admin/people", label: "People", capability: "people" as const },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/");

  const tabs = TABS.filter((tab) => can(user.role, tab.capability));
  // Only organizers set up the email service, so only they need telling.
  const isOrganizer = can(user.role, "events");
  const email = isOrganizer ? emailStatus() : { configured: true, warning: null };
  const cron = isOrganizer ? cronWarning() : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <div className="mr-auto">
          <h1 className="text-xl font-bold">Organizer tools</h1>
          <p className="text-sm text-muted">
            Signed in as {accountHandle(user)} ·{" "}
            <span className="font-medium text-ink">{ROLE_LABELS[user.role]}</span>
          </p>
        </div>
        <AdminTabs tabs={tabs.map(({ href, label }) => ({ href, label }))} />
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

      {cron && (
        <p className="rounded-xl border border-gold/40 bg-clay-light p-4 text-sm text-ink">
          <strong className="font-semibold">The nightly closing job is off.</strong> {cron}
        </p>
      )}

      {children}
    </div>
  );
}
