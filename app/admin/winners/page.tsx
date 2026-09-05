import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { StatusToggle } from "@/components/admin/WinnerRow";

export const dynamic = "force-dynamic";

export default async function WinnersPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const events = await db.auctionEvent.findMany({ orderBy: { createdAt: "desc" } });
  const eventId = params.event ?? events[0]?.id;
  const filter = params.filter ?? "all";

  if (!eventId) {
    return (
      <div className="card p-10 text-center text-muted">
        <p>No auctions yet, so there&rsquo;s nothing to report.</p>
      </div>
    );
  }

  const event = events.find((row) => row.id === eventId) ?? events[0];
  const wins = await db.item.findMany({
    where: {
      eventId,
      winnerId: { not: null },
      ...(filter === "unpaid" ? { paymentStatus: "UNPAID" as const } : {}),
      ...(filter === "uncollected" ? { handoverStatus: "PENDING" as const } : {}),
    },
    include: { winner: true },
    orderBy: { endsAt: "desc" },
  });

  const total = wins.reduce((sum, item) => sum + (item.winningBidCents ?? 0), 0);
  const collected = wins
    .filter((item) => item.paymentStatus === "PAID")
    .reduce((sum, item) => sum + (item.winningBidCents ?? 0), 0);

  const filters = [
    { key: "all", label: "All winners" },
    { key: "unpaid", label: "Unpaid" },
    { key: "uncollected", label: "Not collected" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-bold">Winners &amp; payments</h2>
          <p className="text-sm text-muted">
            {wins.length} {wins.length === 1 ? "winner" : "winners"} ·{" "}
            {formatMoney(total, event.currency)} won ·{" "}
            <span className="text-forest">{formatMoney(collected, event.currency)} collected</span>
          </p>
        </div>
        <a href={`/admin/winners/export?event=${eventId}`} className="btn-secondary btn-sm">
          Download CSV
        </a>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4" action="/admin/winners">
        <div className="min-w-[14rem] flex-1">
          <label className="label" htmlFor="event">
            Auction
          </label>
          <select id="event" name="event" defaultValue={eventId} className="field">
            {events.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="label" htmlFor="filter">
            Show
          </label>
          <select id="filter" name="filter" defaultValue={filter} className="field">
            {filters.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Apply
        </button>
      </form>

      {wins.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          <p>Nothing to show for this auction and filter.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-line bg-parchment/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Winner</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {wins.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/items/${item.id}`} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                    {item.donorName && (
                      <p className="text-xs text-muted">from {item.donorName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">{item.winner?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${item.winner?.email}`} className="hover:underline">
                      {item.winner?.email}
                    </a>
                    {item.winner?.phone && (
                      <p className="text-xs text-muted">{item.winner.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-forest">
                    {formatMoney(item.winningBidCents ?? 0, event.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusToggle
                        itemId={item.id}
                        kind="payment"
                        done={item.paymentStatus === "PAID"}
                      />
                      <StatusToggle
                        itemId={item.id}
                        kind="handover"
                        done={item.handoverStatus === "COLLECTED"}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
