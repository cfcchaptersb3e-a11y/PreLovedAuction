import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { finalizeDueItems, minimumBidCents } from "@/lib/auction";
import { formatMoney } from "@/lib/money";
import { timeLeft } from "@/lib/time";
import { BidForm } from "@/components/BidForm";
import { WatchButton } from "@/components/WatchButton";
import { Gallery } from "@/components/Gallery";
import { Countdown } from "@/components/Countdown";
import { LocalTime } from "@/components/LocalTime";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await db.item.findUnique({ where: { id }, select: { title: true } });
  return { title: item ? `${item.title} — CFC SB3E Auction` : "Item not found" };
}

/** Bidders see each other by first name and last initial, never by email. */
function displayName(user: { name: string | null; email: string }): string {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
  }
  const handle = user.email.split("@")[0];
  return `${handle.slice(0, 2)}${"•".repeat(Math.max(3, handle.length - 2))}`;
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  await finalizeDueItems();

  const { id } = await params;
  const [user, item] = await Promise.all([
    getCurrentUser(),
    db.item.findUnique({
      where: { id },
      include: {
        event: true,
        bids: {
          orderBy: [{ amountCents: "desc" }, { createdAt: "asc" }],
          take: 15,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
  ]);

  if (!item || item.status === "DRAFT") notFound();

  const watching = user
    ? Boolean(await db.watch.findUnique({ where: { userId_itemId: { userId: user.id, itemId: item.id } } }))
    : false;

  const topBid = item.bids[0] ?? null;
  const minimum = minimumBidCents(item, topBid?.amountCents ?? null);
  const live = item.status === "LIVE" && item.event.status === "OPEN" && item.endsAt > new Date();
  const currency = item.event.currency;
  const isWinner = Boolean(user && item.winnerId === user.id);
  const isTopBidder = Boolean(user && topBid?.userId === user.id);
  const bidCount = await db.bid.count({ where: { itemId: item.id } });

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <span aria-hidden>←</span> Back to all items
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <Gallery images={item.imageUrls} title={item.title} />

          <div className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              About this item
            </h2>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">
              {item.description || "No description was provided for this item."}
            </p>
            <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
              {item.condition && (
                <div>
                  <dt className="text-xs text-muted">Condition</dt>
                  <dd className="font-medium">{item.condition}</dd>
                </div>
              )}
              {item.category && (
                <div>
                  <dt className="text-xs text-muted">Category</dt>
                  <dd className="font-medium">{item.category}</dd>
                </div>
              )}
              {item.donorName && (
                <div>
                  <dt className="text-xs text-muted">Provided by</dt>
                  <dd className="font-medium">{item.donorName}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            {item.category && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {item.category}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-bold leading-tight">{item.title}</h1>

            <div className="mt-5 rounded-xl bg-parchment/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {item.status === "ENDED"
                  ? item.winningBidCents
                    ? "Winning bid"
                    : "No winning bid"
                  : bidCount > 0
                    ? "Current bid"
                    : "Starting bid"}
              </p>
              <p className="text-3xl font-bold text-forest">
                {formatMoney(
                  item.status === "ENDED"
                    ? item.winningBidCents ?? topBid?.amountCents ?? item.startingBidCents
                    : topBid?.amountCents ?? item.startingBidCents,
                  currency
                )}
              </p>
              <p className="mt-1 text-sm text-muted">
                {bidCount} {bidCount === 1 ? "bid" : "bids"}
                {live && item.isLiveLot && (
                  <>
                    {" · "}
                    <span className="font-semibold text-clay">sold live at the event</span>
                  </>
                )}
                {live && !item.isLiveLot && (
                  <>
                    {" · "}
                    <Countdown endsAt={item.endsAt.toISOString()} initialLabel={timeLeft(item.endsAt)} />
                  </>
                )}
              </p>
              {live && item.isLiveLot && (
                <p className="mt-2 text-xs text-muted">
                  This lot is saved for the live auction at the gathering. Bid now to set the
                  opening price — the auctioneer sells it in the room, and you can keep bidding
                  from home while that happens.
                </p>
              )}
              {live && !item.isLiveLot && (
                <p className="mt-2 text-xs text-muted">
                  Closes{" "}
                  <LocalTime
                    iso={item.endsAt.toISOString()}
                    fallback={`${item.endsAt.toISOString().slice(0, 16).replace("T", " ")} UTC`}
                  />{" "}
                  · a bid in the last 2 minutes extends the clock, so nobody can snipe it at the
                  buzzer.
                </p>
              )}
            </div>

            {isTopBidder && live && (
              <p className="mt-3 rounded-lg bg-forest-light px-3 py-2 text-sm font-medium text-forest">
                You are the highest bidder.
              </p>
            )}
            {isWinner && (
              <p className="mt-3 rounded-lg bg-forest-light px-3 py-2 text-sm font-medium text-forest">
                🎉 You won this item! See <Link href="/account" className="underline">My bids</Link> for
                payment details.
              </p>
            )}

            <div className="mt-5 space-y-3">
              {live ? (
                user ? (
                  <BidForm
                    itemId={item.id}
                    minimumCents={minimum}
                    incrementCents={item.bidIncrementCents}
                    currency={currency}
                  />
                ) : (
                  <Link href="/login" className="btn-primary w-full">
                    Sign in to place a bid
                  </Link>
                )
              ) : (
                <p className="rounded-lg bg-parchment px-3 py-3 text-center text-sm text-muted">
                  {item.status === "CANCELLED"
                    ? "This item was withdrawn from the auction."
                    : "Bidding on this item has closed."}
                </p>
              )}

              {user && item.status === "LIVE" && (
                <WatchButton itemId={item.id} watching={watching} fullWidth />
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Bid history
            </h2>
            {item.bids.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No bids yet — be the first to support the chapter.
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-line text-sm">
                {item.bids.map((bid, index) => (
                  <li key={bid.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2">
                      {index === 0 && (
                        <span className="chip bg-forest-light text-forest">Top</span>
                      )}
                      {bid.channel === "ROOM" && (
                        <span className="chip bg-parchment text-muted">In the room</span>
                      )}
                      <span className="truncate">
                        {bid.user
                          ? bid.user.id === user?.id
                            ? "You"
                            : displayName(bid.user)
                          : (bid.bidderLabel ?? "In the room")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="font-semibold">{formatMoney(bid.amountCents, currency)}</span>
                      <span className="ml-2 text-xs text-muted">
                        <LocalTime
                          iso={bid.createdAt.toISOString()}
                          fallback={`${bid.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC`}
                        />
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
