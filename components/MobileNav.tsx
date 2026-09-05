"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";

type NavLink = { href: string; label: string };

export function MobileNav({
  links,
  signedIn,
  email,
}: {
  links: NavLink[];
  signedIn: boolean;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Navigating should always dismiss the menu, including on back/forward.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="btn-secondary btn-sm"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden>{open ? "✕" : "☰"}</span> Menu
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block border-b border-line px-4 py-3 text-sm font-medium text-ink last:border-b-0 hover:bg-parchment"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-line bg-parchment/50 p-3">
            {signedIn ? (
              <div className="space-y-2">
                <p className="truncate text-xs text-muted">{email}</p>
                <SignOutButton />
              </div>
            ) : (
              <Link href="/login" className="btn-primary btn-sm w-full">
                Sign in to bid
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
