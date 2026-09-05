import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { timeLeft } from "@/lib/time";
import { Countdown } from "@/components/Countdown";

export type ItemCardData = {
  id: string;
  title: string;
  imageUrls: string[];
  donorName: string | null;
  category: string | null;
  startingBidCents: number;
  endsAt: Date;
  status: string;
  winningBidCents: number | null;
  topBidCents: number;
  bidCount: number;
};

export function ItemCard({ item, currency }: { item: ItemCardData; currency: string }) {
  const ended = item.status === "ENDED";
  const price = ended
    ? item.winningBidCents ?? item.topBidCents
    : item.bidCount > 0
      ? item.topBidCents
      : item.startingBidCents;

  return (
    <Link
      href={`/items/${item.id}`}
      className="card group flex flex-col overflow-hidden transition hover:border-forest/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-parchment">
        {item.imageUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrls[0]}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full place-items-center text-3xl text-muted/40" aria-hidden>
            🎁
          </div>
        )}
        {ended && (
          <span className="absolute left-2 top-2 chip bg-ink/85 text-white">
            {item.winningBidCents ? "Sold" : "Ended"}
          </span>
        )}
        {item.imageUrls.length > 1 && (
          <span className="absolute right-2 top-2 chip bg-white/90 text-muted">
            {item.imageUrls.length} photos
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {item.category && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {item.category}
          </p>
        )}
        <h3 className="line-clamp-2 font-semibold leading-snug">{item.title}</h3>
        {item.donorName && (
          <p className="mt-1 text-xs text-muted">Donated by {item.donorName}</p>
        )}

        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted">
                {ended ? (item.winningBidCents ? "Winning bid" : "No bids") : item.bidCount > 0 ? "Current bid" : "Starting bid"}
              </p>
              <p className="text-lg font-bold text-forest">{formatMoney(price, currency)}</p>
            </div>
            <p className="text-right text-xs">
              {ended ? (
                <span className="text-muted">
                  {item.bidCount} {item.bidCount === 1 ? "bid" : "bids"}
                </span>
              ) : (
                <Countdown endsAt={item.endsAt.toISOString()} initialLabel={timeLeft(item.endsAt)} />
              )}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
