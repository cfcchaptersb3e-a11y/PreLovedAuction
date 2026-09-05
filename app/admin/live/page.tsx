import Link from "next/link";
import { db } from "@/lib/db";
import { getActiveEvent } from "@/lib/auction";
import { getLiveState, describeBidder } from "@/lib/live";
import { requirePageCapability } from "@/lib/page-guards";
import { OperatorConsole } from "@/components/live/OperatorConsole";

export const dynamic = "force-dynamic";

export default async function LiveConsolePage() {
  await requirePageCapability("events");

  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="card p-10 text-center text-muted">
        <p>No auction is running, so there is nothing to auction live.</p>
      </div>
    );
  }

  const { lots, current } = await getLiveState(event);

  const winners = await db.user.findMany({
    where: { id: { in: lots.map((l) => l.winnerId).filter((id): id is string => Boolean(id)) } },
    select: { id: true, name: true, email: true },
  });
  const winnerById = new Map(winners.map((w) => [w.id, w]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-bold">Run the live auction</h2>
          <p className="text-sm text-muted">
            Record bids called in the room. People at home bid into the same lot, and their bids
            appear here.
          </p>
        </div>
        <Link href="/live" className="btn-secondary btn-sm" target="_blank">
          Open the audience view
        </Link>
      </div>

      <p className="rounded-xl border border-line bg-parchment/60 p-4 text-sm text-muted">
        <strong className="font-semibold text-ink">If the connection drops:</strong> keep calling
        lots on paper and enter them here once it returns. Nothing here needs to be live for the
        auction to continue — the record just catches up.
      </p>

      <OperatorConsole
        eventId={event.id}
        currency={event.currency}
        lots={lots.map((lot) => ({
          id: lot.id,
          title: lot.title,
          lotNumber: lot.lotNumber,
          status: lot.status,
          winningBidCents: lot.winningBidCents,
          winnerName: lot.winnerId
            ? describeBidder(
                null,
                winnerById.get(lot.winnerId)?.name,
                winnerById.get(lot.winnerId)?.email
              )
            : lot.winnerLabel,
        }))}
        current={
          current
            ? {
                id: current.item.id,
                title: current.item.title,
                currentBidCents: current.currentBidCents,
                minimumBidCents: current.minimumBidCents,
                incrementCents: current.item.bidIncrementCents,
                bidCount: current.bidCount,
                leader: current.leader,
                reserveCents: current.item.reserveCents,
              }
            : null
        }
      />
    </div>
  );
}
