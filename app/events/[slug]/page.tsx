import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getEventTotals, getTopBids } from "@/lib/auction";
import { GoalProgress } from "@/components/GoalProgress";
import { ItemGrid } from "@/components/ItemGrid";
import { ItemFilters } from "@/components/ItemFilters";
import type { ItemCardData } from "@/components/ItemCard";
import {
  DEFAULT_PER_PAGE,
  Pager,
  PerPageLinks,
  clampPage,
  pageFrom,
  perPageFrom,
  sliceFor,
} from "@/components/Pager";

import {
  ITEM_SORTS,
  ITEM_STATUS_FILTERS,
  itemTextSearch,
  sortKeyFrom,
  statusFilterFrom,
} from "@/lib/item-filters";

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

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    per?: string;
    q?: string;
    category?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  const { slug } = await params;
  const event = await db.auctionEvent.findUnique({ where: { slug } });
  if (!event || event.status === "DRAFT") notFound();

  const chosen = await searchParams;
  const per = perPageFrom(chosen.per);
  const search = (chosen.q ?? "").trim();
  const category = (chosen.category ?? "").trim();
  const sortKey = sortKeyFrom(chosen.sort);
  const statusFilter = statusFilterFrom(chosen.status);

  const where = {
    eventId: event.id,
    status: { in: [...ITEM_STATUS_FILTERS[statusFilter].statuses] },
    ...(category ? { category } : {}),
    ...itemTextSearch(search),
  };

  const matching = await db.item.count({ where });
  const page = clampPage(pageFrom(chosen.page), matching, per);

  const [items, totals, categoryRows] = await Promise.all([
    db.item.findMany({
      where,
      orderBy: ITEM_SORTS[sortKey].orderBy,
      ...sliceFor(page, per),
    }),
    getEventTotals(event),
    // Every category in the auction, not just this page's — the filter has to
    // offer what is there to be found.
    db.item.findMany({
      where: { eventId: event.id, status: { in: ["LIVE", "ENDED"] }, category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  const categoryNames = categoryRows
    .map((row) => row.category)
    .filter((name): name is string => Boolean(name));

  const filterParams = {
    q: search || undefined,
    category: category || undefined,
    sort: sortKey !== "ending" ? sortKey : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  };
  const basePath = `/events/${event.slug}`;

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
      <ItemFilters
        action={basePath}
        categories={categoryNames}
        query={search}
        category={category}
        sort={sortKey}
        status={statusFilter}
        hidden={{ per: per === DEFAULT_PER_PAGE ? undefined : String(per) }}
        clearHref={basePath}
      />

      <div className="flex justify-end">
        <PerPageLinks per={per} total={matching} basePath={basePath} params={filterParams} />
      </div>

      <ItemGrid items={cards} currency={event.currency} />

      <Pager
        total={matching}
        page={page}
        per={per}
        basePath={basePath}
        params={filterParams}
      />
    </div>
  );
}
