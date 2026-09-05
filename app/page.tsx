import Link from "next/link";
import { db } from "@/lib/db";
import { finalizeDueItems, getActiveEvent, getEventTotals, getTopBids } from "@/lib/auction";
import { getCurrentUser } from "@/lib/auth";
import { GoalProgress } from "@/components/GoalProgress";
import { ItemGrid } from "@/components/ItemGrid";
import type { ItemCardData } from "@/components/ItemCard";

// Bids and countdowns change constantly, so this page is always freshly rendered.
export const dynamic = "force-dynamic";

const SORTS = {
  ending: { label: "Ending soonest", orderBy: { endsAt: "asc" } as const },
  newest: { label: "Newest first", orderBy: { createdAt: "desc" } as const },
  title: { label: "A–Z", orderBy: { title: "asc" } as const },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; show?: string }>;
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
  const requestedSort = params.sort ?? "ending";
  const sortKey: keyof typeof SORTS =
    requestedSort in SORTS ? (requestedSort as keyof typeof SORTS) : "ending";
  const showEnded = params.show === "ended";

  const [items, totals, categories] = await Promise.all([
    db.item.findMany({
      where: {
        eventId: event.id,
        status: showEnded ? "ENDED" : "LIVE",
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" as const } },
                { description: { contains: query, mode: "insensitive" as const } },
                { donorName: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: showEnded ? { endsAt: "desc" } : SORTS[sortKey].orderBy,
    }),
    getEventTotals(event.id),
    db.item.findMany({
      where: { eventId: event.id, status: { in: ["LIVE", "ENDED"] }, category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  const topBids = await getTopBids(items.map((item) => item.id));
  const cards: ItemCardData[] = items.map((item) => ({
    ...item,
    topBidCents: topBids.get(item.id)?.amountCents ?? 0,
    bidCount: topBids.get(item.id)?.count ?? 0,
  }));

  const liveCount = await db.item.count({ where: { eventId: event.id, status: "LIVE" } });

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-forest to-forest-dark p-6 text-white md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
          {event.status === "OPEN" ? "Now accepting bids" : "This auction has closed"}
        </p>
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
            <span className="ml-2 text-sm font-normal text-muted">({cards.length})</span>
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

        <form className="card mb-5 flex flex-wrap items-end gap-3 p-4" action="/">
          {showEnded && <input type="hidden" name="show" value="ended" />}
          <div className="min-w-[12rem] flex-1">
            <label className="label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Bag, guitar, donor's name…"
              className="field"
            />
          </div>
          {categories.length > 0 && (
            <div className="w-40">
              <label className="label" htmlFor="category">
                Category
              </label>
              <select id="category" name="category" defaultValue={category} className="field">
                <option value="">All</option>
                {categories.map(
                  (row) =>
                    row.category && (
                      <option key={row.category} value={row.category}>
                        {row.category}
                      </option>
                    )
                )}
              </select>
            </div>
          )}
          {!showEnded && (
            <div className="w-44">
              <label className="label" htmlFor="sort">
                Sort by
              </label>
              <select id="sort" name="sort" defaultValue={sortKey} className="field">
                {Object.entries(SORTS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary">
            Apply
          </button>
          {(query || category || sortKey !== "ending") && (
            <Link href={showEnded ? "/?show=ended" : "/"} className="btn-secondary">
              Clear
            </Link>
          )}
        </form>

        <ItemGrid items={cards} currency={event.currency} />
      </section>
    </div>
  );
}
