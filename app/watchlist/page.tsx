import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { finalizeDueItems, getTopBids } from "@/lib/auction";
import { ItemGrid } from "@/components/ItemGrid";
import type { ItemCardData } from "@/components/ItemCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My watchlist — CFC SB3E Auction" };

export default async function WatchlistPage() {
  await finalizeDueItems();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Your watchlist</h1>
        <p className="mt-2 text-muted">
          Sign in to star the items you&rsquo;re interested in and keep them all in one place.
        </p>
        <Link href="/login" className="btn-primary mt-5">
          Sign in
        </Link>
      </div>
    );
  }

  const watches = await db.watch.findMany({
    where: { userId: user.id, item: { status: { in: ["LIVE", "ENDED"] } } },
    include: { item: { include: { event: true } } },
    orderBy: { item: { endsAt: "asc" } },
  });

  const topBids = await getTopBids(watches.map((watch) => watch.itemId));
  const cards: ItemCardData[] = watches.map((watch) => ({
    ...watch.item,
    topBidCents: topBids.get(watch.itemId)?.amountCents ?? 0,
    bidCount: topBids.get(watch.itemId)?.count ?? 0,
  }));
  const currency = watches[0]?.item.event.currency ?? "PHP";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My watchlist</h1>
        <p className="mt-1 text-muted">
          {cards.length === 0
            ? "You haven't starred anything yet."
            : `${cards.length} ${cards.length === 1 ? "item" : "items"} you're following.`}
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl" aria-hidden>
            ☆
          </p>
          <p className="mt-2 text-muted">
            Tap <strong>Watch this item</strong> on any listing to add it here.
          </p>
          <Link href="/" className="btn-primary mt-5">
            Browse the auction
          </Link>
        </div>
      ) : (
        <ItemGrid items={cards} currency={currency} />
      )}
    </div>
  );
}
