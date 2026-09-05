import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getActiveEvent } from "@/lib/auction";
import { getLiveState } from "@/lib/live";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { LiveLotView } from "@/components/live/LiveLotView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live auction — CFC SB3E" };

export default async function LivePage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <h1 className="text-xl font-bold">No auction is running</h1>
        <Link href="/" className="btn-primary mt-5">
          Back to the auction
        </Link>
      </div>
    );
  }

  const [{ lots, current }, user] = await Promise.all([getLiveState(event), getCurrentUser()]);

  const youLead = current && user
    ? Boolean(
        await db.bid.findFirst({
          where: { itemId: current.item.id },
          orderBy: [{ amountCents: "desc" }, { createdAt: "asc" }],
          select: { userId: true },
        }).then((top) => top?.userId === user.id)
      )
    : false;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold md:text-3xl">Live auction</h1>
        <p className="mt-1 text-muted">
          {event.liveNote ?? "Bidding alongside the room, lot by lot."}
        </p>
      </div>

      <LiveLotView
        itemId={current?.item.id ?? null}
        title={current?.item.title ?? null}
        photo={current?.item.imageUrls[0] ?? null}
        currentBidCents={current?.currentBidCents ?? 0}
        minimumBidCents={current?.minimumBidCents ?? 0}
        bidCount={current?.bidCount ?? 0}
        leader={current?.leader ?? null}
        currency={event.currency}
        signedIn={Boolean(user)}
        youLead={youLead}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Tonight&rsquo;s lots
        </h2>
        <ol className="card divide-y divide-line">
          {lots.map((lot, index) => {
            const isCurrent = lot.id === current?.item.id;
            return (
              <li
                key={lot.id}
                className={`flex items-center gap-3 p-4 ${isCurrent ? "bg-forest-light" : ""}`}
              >
                <span className="w-8 shrink-0 text-sm font-semibold text-muted">
                  {lot.lotNumber ?? index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <Link href={`/items/${lot.id}`} className="font-medium hover:underline">
                    {lot.title}
                  </Link>
                </span>
                {lot.status === "ENDED" ? (
                  <span className="chip bg-parchment text-muted">
                    {lot.winningBidCents
                      ? `Sold ${formatMoney(lot.winningBidCents, event.currency)}`
                      : "Passed"}
                  </span>
                ) : isCurrent ? (
                  <span className="chip bg-forest text-white">Now</span>
                ) : (
                  <span className="chip bg-parchment text-muted">Upcoming</span>
                )}
              </li>
            );
          })}
          {lots.length === 0 && (
            <li className="p-8 text-center text-muted">No lots have been set aside yet.</li>
          )}
        </ol>
      </section>
    </div>
  );
}
