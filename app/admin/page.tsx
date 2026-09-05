import Link from "next/link";
import { db } from "@/lib/db";
import { getEventTotals } from "@/lib/auction";
import { formatMoney } from "@/lib/money";
import { EventStatusButtons } from "@/components/admin/EventStatusButtons";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const events = await db.auctionEvent.findMany({ orderBy: { createdAt: "desc" } });
  const totals = await Promise.all(events.map((event) => getEventTotals(event.id)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-bold">Auctions</h2>
          <p className="text-sm text-muted">
            Each auction has its own items, goal and running total. Start a new one whenever the
            chapter fundraises again — the total begins at zero.
          </p>
        </div>
        <Link href="/admin/events/new" className="btn-primary">
          + New auction
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl" aria-hidden>
            🏷️
          </p>
          <p className="mt-2 font-medium">No auctions yet</p>
          <p className="mt-1 text-sm text-muted">
            Create your first auction, add the donated items, then open it for bidding.
          </p>
          <Link href="/admin/events/new" className="btn-primary mt-5">
            Create an auction
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="card p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="font-bold hover:underline"
                    >
                      {event.name}
                    </Link>
                    <span
                      className={`chip ${
                        event.status === "OPEN"
                          ? "bg-forest-light text-forest"
                          : event.status === "DRAFT"
                            ? "bg-clay-light text-clay"
                            : "bg-parchment text-muted"
                      }`}
                    >
                      {event.status === "OPEN"
                        ? "Open for bidding"
                        : event.status === "DRAFT"
                          ? "Draft — not visible"
                          : "Closed"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {totals[index].itemsTotal} items ·{" "}
                    <span className="font-semibold text-forest">
                      {formatMoney(totals[index].raisedCents, event.currency)}
                    </span>{" "}
                    raised
                    {totals[index].goalCents > 0 &&
                      ` of ${formatMoney(totals[index].goalCents, event.currency)} goal (${totals[index].percent}%)`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/events/${event.id}`} className="btn-secondary btn-sm">
                    Manage items
                  </Link>
                  <EventStatusButtons eventId={event.id} status={event.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
