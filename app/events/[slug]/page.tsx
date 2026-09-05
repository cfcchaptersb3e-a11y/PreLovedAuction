import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getEventTotals, getTopBids } from "@/lib/auction";
import { GoalProgress } from "@/components/GoalProgress";
import { ItemGrid } from "@/components/ItemGrid";
import type { ItemCardData } from "@/components/ItemCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await db.auctionEvent.findUnique({ where: { slug }, select: { name: true } });
  return { title: event ? `${event.name} — CFC SB3E` : "Auction not found" };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await db.auctionEvent.findUnique({ where: { slug } });
  if (!event || event.status === "DRAFT") notFound();

  const [items, totals] = await Promise.all([
    db.item.findMany({
      where: { eventId: event.id, status: { in: ["LIVE", "ENDED"] } },
      orderBy: [{ winningBidCents: "desc" }, { endsAt: "desc" }],
    }),
    getEventTotals(event.id),
  ]);

  const topBids = await getTopBids(items.map((item) => item.id));
  const cards: ItemCardData[] = items.map((item) => ({
    ...item,
    topBidCents: topBids.get(item.id)?.amountCents ?? 0,
    bidCount: topBids.get(item.id)?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <span aria-hidden>←</span> All auctions
      </Link>

      <div>
        <span
          className={`chip ${event.status === "OPEN" ? "bg-forest-light text-forest" : "bg-parchment text-muted"}`}
        >
          {event.status === "OPEN" ? "Live now" : "Closed"}
        </span>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">{event.name}</h1>
        {event.tagline && <p className="mt-1 text-muted">{event.tagline}</p>}
        {event.description && (
          <p className="mt-3 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {event.description}
          </p>
        )}
      </div>

      <GoalProgress totals={totals} currency={event.currency} />
      <ItemGrid items={cards} currency={event.currency} />
    </div>
  );
}
