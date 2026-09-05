import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "CFC SB3E Pre-Loved Auction",
  description:
    "An online auction of pre-loved items donated by members of our CFC SB3E chapter, raising funds for chapter activities.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f6f4f",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const watchCount = user
    ? await db.watch.count({ where: { userId: user.id, item: { status: "LIVE" } } })
    : 0;

  const links = [
    { href: "/", label: "Auction" },
    { href: "/watchlist", label: watchCount > 0 ? `Watchlist (${watchCount})` : "Watchlist" },
    { href: "/events", label: "Past auctions" },
    ...(user ? [{ href: "/account", label: "My bids" }] : []),
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-forest text-sm font-bold text-white">
                SB
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold leading-tight">
                  Pre-Loved Auction
                </span>
                <span className="block truncate text-[11px] uppercase tracking-wider text-muted">
                  CFC SB3E Chapter
                </span>
              </span>
            </Link>

            <nav className="ml-auto hidden items-center gap-1 md:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-parchment hover:text-ink"
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <div className="ml-2 flex items-center gap-2 border-l border-line pl-3">
                  <span className="max-w-[14ch] truncate text-xs text-muted" title={user.email}>
                    {user.name || user.email}
                  </span>
                  <SignOutButton />
                </div>
              ) : (
                <Link href="/login" className="btn-primary btn-sm ml-2">
                  Sign in to bid
                </Link>
              )}
            </nav>

            <div className="ml-auto md:hidden">
              <MobileNav links={links} signedIn={Boolean(user)} email={user?.email ?? null} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">{children}</main>

        <footer className="border-t border-line bg-parchment/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted">
            <p className="font-semibold text-ink">CFC SB3E Chapter Pre-Loved Auction</p>
            <p className="mt-1 max-w-prose">
              Every item here was donated by a chapter member, and every peso raised goes to our
              chapter&rsquo;s activities. Thank you for bidding and for your support.
            </p>
            <p className="mt-4 text-xs">
              Questions about an item, payment or pickup? Reply to your confirmation email and an
              organiser will help.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
