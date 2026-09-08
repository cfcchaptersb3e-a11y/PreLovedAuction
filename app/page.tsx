import Link from "next/link";
import { db } from "@/lib/db";
import { finalizeDueItems, getActiveEvent, getEventTotals, getTopBids } from "@/lib/auction";
import { getCurrentUser } from "@/lib/auth";
import { ITEM_SORTS, itemTextSearch, sortKeyFrom } from "@/lib/item-filters";
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

// Bids and countdowns change constantly, so this page is always freshly rendered.
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    show?: string;
    page?: string;
    per?: string;
  }>;
}) {
  // Award anything whose clock ran out, so the page never shows a stale auction.
  await finalizeDueItems();

  const params = await searchParams;
  const [event, user] = await Promise.all([getActiveEvent(), getCurrentUser()]);

  if (!event) {
    return (
      <div className="card mx-auto max-w-xl p-10 text-center">
        <p className="text-4xl" aria-hidden>
          🕊️
        </p>
        <h1 className="mt-3 text-2xl font-bold">No auction is running right now</h1>
        <p className="mt-2 text-muted">
          Our chapter isn&rsquo;t holding an auction at the moment. Watch out for the next one!
        </p>
        {user?.role === "ADMIN" && (
          <Link href="/admin/events/new" className="btn-primary mt-6">
            Set up an auction
          </Link>
        )}
      </div>
    );
  }

  const query = (params.q ?? "").trim();
  const category = (params.category ?? "").trim();
  const sortKey = sortKeyFrom(params.sort);
  const showEnded = params.show === "ended";

  const requestedPage = pageFrom(params.page);
  const per = perPageFrom(params.per);

  const filterParams = {
    q: query || undefined,
    category: category || undefined,
    sort: sortKey !== "ending" ? sortKey : undefined,
    show: showEnded ? "ended" : undefined,
  };

  const where = {
    eventId: event.id,
    status: showEnded ? ("ENDED" as const) : ("LIVE" as const),
    ...(category ? { category } : {}),
    ...itemTextSearch(query),
  };

  // Counted first so a page number past the end lands on the last page rather
  // than on an empty grid.
  const matching = await db.item.count({ where });
  const page = clampPage(requestedPage, matching, per);

  const [items, totals, categories] = await Promise.all([
    db.item.findMany({
      where,
      orderBy: showEnded ? { endsAt: "desc" } : ITEM_SORTS[sortKey].orderBy,
      ...sliceFor(page, per),
    }),
    getEventTotals(event),
    db.item.findMany({
      where: { eventId: event.id, status: { in: ["LIVE", "ENDED"] }, category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  const topBids = await getTopBids(items.map((item) => item.id));
  // The form wants plain names, and the size choice has to survive a search.
  const categoryNames = categories
    .map((row) => row.category)
    .filter((name): name is string => Boolean(name));
  const perParam = per === DEFAULT_PER_PAGE ? undefined : String(per);

  const cards: ItemCardData[] = items.map((item) => ({
    ...item,
    topBidCents: topBids.get(item.id)?.amountCents ?? 0,
    bidCount: topBids.get(item.id)?.count ?? 0,
  }));

  const liveCount = await db.item.count({ where: { eventId: event.id, status: "LIVE" } });

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-forest to-forest-dark p-6 text-white md:p-10">
        <div className="mb-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cfc-emblem-white.png"
            alt="Couples for Christ"
            width={52}
            height={52}
            className="h-13 w-13 object-contain"
            style={{ height: "3.25rem", width: "3.25rem" }}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            {event.status === "OPEN" ? "Now accepting bids" : "This auction has closed"}
          </p>
        </div>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight md:text-4xl">{event.name}</h1>
        {event.tagline && <p className="mt-3 max-w-2xl text-white/85">{event.tagline}</p>}
        {event.description && (
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-white/75">
            {event.description}
          </p>
        )}
        {!user && event.status === "OPEN" && (
          <Link href="/login" className="btn mt-6 bg-white text-forest hover:bg-white/90">
            Sign in to start bidding
          </Link>
        )}
      </section>

      <GoalProgress totals={totals} currency={event.currency} />

      <section>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-xl font-bold">
            {showEnded ? "Sold & ended items" : "Items up for bidding"}
            {/* The whole matching set, not the page — the pager below says
                which slice of it is on screen. */}
            <span className="ml-2 text-sm font-normal text-muted">({matching})</span>
          </h2>
          <div className="flex gap-1 rounded-lg border border-line bg-white p-1 text-sm">
            <Link
              href="/"
              className={`rounded-md px-3 py-1.5 font-medium ${!showEnded ? "bg-forest text-white" : "text-muted hover:bg-parchment"}`}
            >
              Live ({liveCount})
            </Link>
            <Link
              href="/?show=ended"
              className={`rounded-md px-3 py-1.5 font-medium ${showEnded ? "bg-forest text-white" : "text-muted hover:bg-parchment"}`}
            >
              Ended
            </Link>
          </div>
        </div>

        <ItemFilters
          action="/"
          categories={categoryNames}
          query={query}
          category={category}
          // Ended items are always shown most recently closed first.
          sort={showEnded ? null : sortKey}
          // The Live / Ended buttons above already do this job here.
          status={null}
          hidden={{ show: showEnded ? "ended" : undefined, per: perParam }}
          clearHref={showEnded ? "/?show=ended" : "/"}
        />

        {/* Above the grid, so the size is chosen before the scrolling starts
            rather than after it. */}
        <div className="mb-4 flex justify-end">
          <PerPageLinks per={per} total={matching} basePath="/" params={filterParams} />
        </div>

        <ItemGrid items={cards} currency={event.currency} />

        <Pager
          total={matching}
          page={page}
          per={per}
          basePath="/"
          params={filterParams}
        />
      </section>
    </div>
  );
}
