import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { finalizeDueItems } from "@/lib/auction";
import { formatMoney } from "@/lib/money";
import { timeLeft } from "@/lib/time";
import { ProfileForm } from "@/components/ProfileForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My bids — CFC SB3E Auction" };

export default async function AccountPage() {
  await finalizeDueItems();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">My bids</h1>
        <p className="mt-2 text-muted">Sign in to see the items you&rsquo;ve bid on and won.</p>
        <Link href="/login" className="btn-primary mt-5">
          Sign in
        </Link>
      </div>
    );
  }

  const [wins, myBids] = await Promise.all([
    db.item.findMany({
      where: { winnerId: user.id },
      include: { event: true },
      orderBy: { endsAt: "desc" },
    }),
    db.bid.findMany({
      where: { userId: user.id },
      distinct: ["itemId"],
      orderBy: [{ itemId: "asc" }, { amountCents: "desc" }],
      include: { item: { include: { event: true } } },
    }),
  ]);

  // For each item bid on, work out whether this bidder is still on top.
  const topByItem = await db.bid.groupBy({
    by: ["itemId"],
    where: { itemId: { in: myBids.map((bid) => bid.itemId) } },
    _max: { amountCents: true },
  });
  const topAmount = new Map(topByItem.map((row) => [row.itemId, row._max.amountCents ?? 0]));

  const active = myBids
    .filter((bid) => bid.item.status === "LIVE")
    .sort((a, b) => a.item.endsAt.getTime() - b.item.endsAt.getTime());
  const totalWon = wins.reduce((sum, item) => sum + (item.winningBidCents ?? 0), 0);
  const unpaid = wins.filter((item) => item.paymentStatus === "UNPAID");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My bids</h1>
        <p className="mt-1 text-muted">{user.email}</p>
      </div>

      {wins.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">
            Items you won{" "}
            <span className="text-sm font-normal text-muted">
              · {formatMoney(totalWon, wins[0].event.currency)} total
            </span>
          </h2>

          {unpaid.length > 0 && unpaid[0].event.paymentInstructions && (
            <div className="rounded-xl border border-gold/30 bg-clay-light p-4">
              <p className="text-sm font-semibold text-ink">How to pay</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                {unpaid[0].event.paymentInstructions}
              </p>
              {unpaid[0].event.pickupInstructions && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                  <span className="font-semibold text-ink">Pickup: </span>
                  {unpaid[0].event.pickupInstructions}
                </p>
              )}
            </div>
          )}

          <div className="card divide-y divide-line">
            {wins.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                <Link href={`/items/${item.id}`} className="min-w-0 flex-1 font-medium hover:underline">
                  {item.title}
                </Link>
                <span className="font-semibold text-forest">
                  {formatMoney(item.winningBidCents ?? 0, item.event.currency)}
                </span>
                <span
                  className={`chip ${item.paymentStatus === "PAID" ? "bg-forest-light text-forest" : "bg-clay-light text-clay"}`}
                >
                  {item.paymentStatus === "PAID" ? "Paid" : "Payment due"}
                </span>
                <span
                  className={`chip ${item.handoverStatus === "COLLECTED" ? "bg-forest-light text-forest" : "bg-parchment text-muted"}`}
                >
                  {item.handoverStatus === "COLLECTED" ? "Collected" : "For pickup"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Items you&rsquo;re bidding on</h2>
        {active.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            <p>You have no active bids right now.</p>
            <Link href="/" className="btn-primary mt-4">
              Browse the auction
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-line">
            {active.map((bid) => {
              const winning = (topAmount.get(bid.itemId) ?? 0) <= bid.amountCents;
              return (
                <div key={bid.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/items/${bid.itemId}`} className="font-medium hover:underline">
                      {bid.item.title}
                    </Link>
                    <p className="text-xs text-muted">{timeLeft(bid.item.endsAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Your bid</p>
                    <p className="font-semibold">
                      {formatMoney(bid.amountCents, bid.item.event.currency)}
                    </p>
                  </div>
                  <span
                    className={`chip ${winning ? "bg-forest-light text-forest" : "bg-clay-light text-clay"}`}
                  >
                    {winning ? "Highest bidder" : "Outbid"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Your details</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Adding your name and number helps organisers arrange payment and pickup if you win.
        </p>
        <ProfileForm name={user.name} phone={user.phone} />
      </section>
    </div>
  );
}
