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
  isLiveLot: boolean;
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
        {!ended && item.isLiveLot && (
          <span className="absolute left-2 top-2 chip bg-clay text-white">Live finale</span>
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

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {item.category && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {item.category}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
          {item.title}
        </h3>
        {item.donorName && (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted sm:text-xs">
            Provided by {item.donorName}
          </p>
        )}

        <div className="mt-auto pt-3">
          {/* Price over countdown in a narrow column, side by side once there
              is room — at two-up on a phone they will not fit on one line. */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted sm:text-[11px]">
                {ended ? (item.winningBidCents ? "Winning bid" : "No bids") : item.bidCount > 0 ? "Current bid" : "Starting bid"}
              </p>
              <p className="text-base font-bold text-forest sm:text-lg">
                {formatMoney(price, currency)}
              </p>
            </div>
            <p className="text-xs sm:text-right">
              {ended ? (
                <span className="text-muted">
                  {item.bidCount} {item.bidCount === 1 ? "bid" : "bids"}
                </span>
              ) : item.isLiveLot ? (
                <span className="font-semibold text-clay">Live lot</span>
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
