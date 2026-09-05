import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getEventTotals } from "@/lib/auction";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Past auctions — CFC SB3E" };

export default async function EventsPage() {
  const events = await db.auctionEvent.findMany({
    where: { status: { in: ["OPEN", "CLOSED"] } },
    orderBy: { createdAt: "desc" },
  });

  const totals = await Promise.all(events.map((event) => getEventTotals(event.id)));
  const grandTotal = totals.reduce((sum, row) => sum + row.raisedCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Our auctions</h1>
        <p className="mt-1 text-muted">
          Every fundraising drive our chapter has run, and what each one raised.
        </p>
      </div>

      {events.length > 1 && (
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Raised across all auctions
          </p>
          <p className="text-3xl font-bold text-forest">
            {formatMoney(grandTotal, events[0].currency)}
          </p>
        </div>
      )}

      {events.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          <p>No auctions have been held yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event, index) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="card p-5 transition hover:border-forest/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold leading-snug">{event.name}</h2>
                <span
                  className={`chip shrink-0 ${event.status === "OPEN" ? "bg-forest-light text-forest" : "bg-parchment text-muted"}`}
                >
                  {event.status === "OPEN" ? "Live now" : "Closed"}
                </span>
              </div>
              {event.tagline && <p className="mt-1 text-sm text-muted">{event.tagline}</p>}
              <p className="mt-4 text-2xl font-bold text-forest">
                {formatMoney(totals[index].raisedCents, event.currency)}
              </p>
              <p className="text-xs text-muted">
                raised from {totals[index].itemsSold} of {totals[index].itemsTotal} items
                {totals[index].goalCents > 0 && ` · ${totals[index].percent}% of goal`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
