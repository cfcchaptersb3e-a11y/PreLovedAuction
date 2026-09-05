import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const TABS = [
  { href: "/admin", label: "Auctions" },
  { href: "/admin/winners", label: "Winners & payments" },
  { href: "/admin/people", label: "People" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

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
      {children}
    </div>
  );
}
