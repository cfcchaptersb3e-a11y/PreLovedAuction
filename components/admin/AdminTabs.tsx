"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The organizer tools' navigation.
 *
 * Written as a client component only so it can read the current path: without
 * a highlighted tab these read as four grey words above the page and organizers
 * could not tell the menu from the content, or see where they were.
 */
export function AdminTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Organizer tools"
      className="grid w-full grid-cols-2 gap-1 rounded-xl border border-line bg-parchment/70 p-1 sm:flex sm:w-auto"
    >
      {tabs.map((tab) => {
        // Every path starts with /admin, so that one has to match exactly.
        const active =
          tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
              active
                ? "bg-white text-ink shadow-sm ring-1 ring-line"
                : "text-muted hover:bg-white/70 hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
