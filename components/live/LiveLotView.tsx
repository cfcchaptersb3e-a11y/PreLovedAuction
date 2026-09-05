"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { placeOnlineLiveBid, type LiveFormState } from "@/app/actions/live";
import { formatMoney } from "@/lib/money";

/**
 * What people at home see during the live finale. It refreshes itself every
 * couple of seconds rather than holding a socket open: a dropped update simply
 * arrives on the next tick instead of leaving the page stuck.
 */
const REFRESH_MS = 2500;

function BidButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full text-base" disabled={pending}>
      {pending ? "Bidding…" : label}
    </button>
  );
}

export function LiveLotView({
  itemId,
  title,
  photo,
  currentBidCents,
  minimumBidCents,
  bidCount,
  leader,
  currency,
  signedIn,
  youLead,
}: {
  itemId: string | null;
  title: string | null;
  photo: string | null;
  currentBidCents: number;
  minimumBidCents: number;
  bidCount: number;
  leader: string | null;
  currency: string;
  signedIn: boolean;
  youLead: boolean;
}) {
  const [state, action] = useActionState<LiveFormState, FormData>(placeOnlineLiveBid, {});
  const router = useRouter();
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
      setStale(false);
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => setStale(true), REFRESH_MS * 4);
    return () => clearTimeout(timer);
  }, [currentBidCents, itemId]);

  if (!itemId) {
    return (
      <div className="card p-10 text-center">
        <p className="text-4xl" aria-hidden>
          🔨
        </p>
        <h2 className="mt-3 text-xl font-bold">Waiting for the next lot</h2>
        <p className="mt-2 text-muted">
          The auctioneer is between lots. This page updates on its own — no need to refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={title ?? ""} className="aspect-[4/3] w-full object-cover" />
      )}
      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-clay">
          Under the hammer now
        </p>
        <h2 className="mt-1 text-2xl font-bold leading-tight">{title}</h2>

        <div className="mt-5 rounded-xl bg-parchment/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {bidCount > 0 ? "Current bid" : "Opening bid"}
          </p>
          <p className="text-4xl font-bold text-forest">
            {formatMoney(currentBidCents || minimumBidCents, currency)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {bidCount} {bidCount === 1 ? "bid" : "bids"}
            {leader && ` · leading: ${leader}`}
          </p>
        </div>

        {youLead && (
          <p className="mt-3 rounded-lg bg-forest-light px-3 py-2 text-sm font-medium text-forest">
            You hold the highest bid.
          </p>
        )}

        <div className="mt-5">
          {signedIn ? (
            <form action={action} className="space-y-2">
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="amount" value={(minimumBidCents / 100).toString()} />
              <BidButton label={`Bid ${formatMoney(minimumBidCents, currency)}`} />
              {state.error && (
                <p className="rounded-lg bg-clay-light px-3 py-2 text-sm text-clay" role="alert">
                  {state.error}
                </p>
              )}
            </form>
          ) : (
            <a href="/login" className="btn-primary w-full">
              Sign in to bid
            </a>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-muted">
          {stale ? "Reconnecting…" : "Updating live"}
        </p>
      </div>
    </div>
  );
}
