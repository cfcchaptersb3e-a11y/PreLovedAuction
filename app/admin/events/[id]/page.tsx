import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getEventTotals, getTopBids } from "@/lib/auction";
import { EventForm } from "@/components/admin/EventForm";
import { EventStatusButtons } from "@/components/admin/EventStatusButtons";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ItemManager, type ManagedItem } from "@/components/admin/ItemManager";
import { GoalProgress } from "@/components/GoalProgress";
import { deleteEvent } from "@/app/actions/admin";
import { hasCapability } from "@/lib/auth";
import { requirePageCapability } from "@/lib/page-guards";

export const dynamic = "force-dynamic";

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageCapability("items");
  const manageEvents = await hasCapability("events");

  const { id } = await params;
  const event = await db.auctionEvent.findUnique({ where: { id } });
  if (!event) notFound();

  const [items, totals, categoryRows] = await Promise.all([
    db.item.findMany({
      where: { eventId: id },
      orderBy: [{ status: "asc" }, { endsAt: "asc" }],
      include: { winner: { select: { name: true, email: true } } },
    }),
    getEventTotals(id),
    db.item.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  const topBids = await getTopBids(items.map((item) => item.id));
  const managed: ManagedItem[] = items.map((item) => ({
    ...item,
    bidCount: topBids.get(item.id)?.count ?? 0,
    topBidCents: topBids.get(item.id)?.amountCents ?? 0,
    winnerLabel: item.winner ? item.winner.name || item.winner.email : null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <span aria-hidden>←</span> Back to auctions
          </Link>
          <h2 className="mt-1 text-xl font-bold">{event.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/events/${event.slug}`} className="btn-secondary btn-sm">
            View public page
          </Link>
          {manageEvents && <EventStatusButtons eventId={event.id} status={event.status} />}
        </div>
      </div>

      <GoalProgress totals={totals} currency={event.currency} />

      <ItemManager
        eventId={event.id}
        items={managed}
        currency={event.currency}
        defaultEndsAt={event.endsAt}
        categories={categoryRows.map((row) => row.category!).filter(Boolean)}
        canWithdraw={manageEvents}
      />

      {manageEvents && (
        <details className="card p-5">
          <summary className="cursor-pointer font-semibold">Auction settings</summary>
          <div className="mt-5 border-t border-line pt-5">
            <EventForm event={event} />
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-2 text-sm font-semibold">Danger zone</p>
            <ConfirmButton
              className="btn-danger btn-sm"
              label="Delete this auction"
              confirm="Delete this auction and all of its items? This cannot be undone."
              action={deleteEvent.bind(null, event.id)}
              redirectTo="/admin"
            />
            <p className="mt-2 text-xs text-muted">
              Only possible while no bids have been placed. Closed auctions stay in the archive as
              a record of what the chapter raised.
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
