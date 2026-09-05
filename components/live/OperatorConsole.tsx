"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  closeLotWithoutSelling,
  openLot,
  passLot,
  placeRoomBid,
  sellLot,
  type LiveFormState,
} from "@/app/actions/live";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { formatMoney } from "@/lib/money";

/**
 * The screen the person running the room works from, while an auctioneer is
 * calling. Everything is one tap: the amounts are pre-computed, so nobody is
 * typing figures under pressure. It refreshes so bids from people at home
 * appear here too.
 */
const REFRESH_MS = 2500;

type Lot = {
  id: string;
  title: string;
  lotNumber: number | null;
  status: string;
  winningBidCents: number | null;
  winnerName: string | null;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Recording…" : label}
    </button>
  );
}

export function OperatorConsole({
  eventId,
  currency,
  lots,
  current,
}: {
  eventId: string;
  currency: string;
  lots: Lot[];
  current: {
    id: string;
    title: string;
    currentBidCents: number;
    minimumBidCents: number;
    incrementCents: number;
    bidCount: number;
    leader: string | null;
    reserveCents: number | null;
  } | null;
}) {
  const [state, action] = useActionState<LiveFormState, FormData>(placeRoomBid, {});
  const [bidder, setBidder] = useState("");
  const [amount, setAmount] = useState("");
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  // Keep the amount box on the next legal bid as the price climbs.
  useEffect(() => {
    if (current) setAmount((current.minimumBidCents / 100).toString());
  }, [current?.minimumBidCents, current?.id]);

  const steps = current
    ? [0, 1, 2, 4].map((n) => current.minimumBidCents + n * current.incrementCents)
    : [];

  return (
    <div className="space-y-6">
      {current ? (
        <div className="card border-forest/40 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">{current.title}</h2>
            <span className="chip bg-forest text-white">On the block</span>
          </div>

          <div className="mt-4 rounded-xl bg-parchment/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {current.bidCount > 0 ? "Current bid" : "Opening bid"}
            </p>
            <p className="text-4xl font-bold text-forest">
              {formatMoney(current.currentBidCents || current.minimumBidCents, currency)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {current.bidCount} {current.bidCount === 1 ? "bid" : "bids"}
              {current.leader && ` · leading: ${current.leader}`}
            </p>
            {current.reserveCents !== null &&
              current.currentBidCents < current.reserveCents && (
                <p className="mt-2 text-sm font-medium text-clay">
                  Below the reserve of {formatMoney(current.reserveCents, currency)}
                </p>
              )}
          </div>

          <form action={action} className="mt-5 space-y-3">
            <input type="hidden" name="itemId" value={current.id} />
            <div>
              <label className="label" htmlFor="bidderLabel">
                Who bid?
              </label>
              <input
                id="bidderLabel"
                name="bidderLabel"
                value={bidder}
                onChange={(event) => setBidder(event.target.value)}
                placeholder="Paddle 12, or a name"
                className="field text-base"
                autoComplete="off"
              />
            </div>

            <div>
              <span className="label">Amount</span>
              <div className="flex flex-wrap gap-2">
                {steps.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount((value / 100).toString())}
                    className={`btn-sm rounded-lg border px-3 py-2 text-sm font-semibold ${
                      amount === (value / 100).toString()
                        ? "border-forest bg-forest text-white"
                        : "border-line bg-white text-ink"
                    }`}
                  >
                    {formatMoney(value, currency)}
                  </button>
                ))}
              </div>
              <input
                name="amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="field mt-2"
                aria-label="Bid amount"
              />
            </div>

            <Submit label="Record room bid" />
            {state.error && (
              <p className="rounded-lg bg-clay-light px-3 py-2 text-sm text-clay" role="alert">
                {state.error}
              </p>
            )}
            {state.message && (
              <p className="rounded-lg bg-forest-light px-3 py-2 text-sm text-forest" role="status">
                {state.message}
              </p>
            )}
          </form>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <ConfirmButton
              className="btn-primary"
              label="Sold"
              pendingLabel="Selling…"
              confirm="Sell this lot to the highest bidder?"
              action={sellLot.bind(null, current.id)}
            />
            <ConfirmButton
              className="btn-danger btn-sm"
              label="No sale"
              confirm="Pass on this lot? Nobody wins it."
              action={passLot.bind(null, current.id)}
            />
            <ConfirmButton
              label="Step away"
              confirm="Leave this lot open but stop showing it as the current lot?"
              action={closeLotWithoutSelling.bind(null, eventId)}
            />
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-3xl" aria-hidden>
            🔨
          </p>
          <p className="mt-2 font-medium">No lot on the block</p>
          <p className="mt-1 text-sm text-muted">Start the next lot from the list below.</p>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Lots ({lots.length})
        </h2>
        <ol className="card divide-y divide-line">
          {lots.map((lot, index) => (
            <li key={lot.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="w-8 shrink-0 text-sm font-semibold text-muted">
                {lot.lotNumber ?? index + 1}
              </span>
              <span className="min-w-0 flex-1 font-medium">{lot.title}</span>
              {lot.status === "ENDED" ? (
                <span className="chip bg-parchment text-muted">
                  {lot.winningBidCents
                    ? `Sold ${formatMoney(lot.winningBidCents, currency)}${lot.winnerName ? ` — ${lot.winnerName}` : ""}`
                    : "Passed"}
                </span>
              ) : lot.id === current?.id ? (
                <span className="chip bg-forest text-white">On the block</span>
              ) : (
                <ConfirmButton
                  className="btn-secondary btn-sm"
                  label="Start this lot"
                  action={openLot.bind(null, lot.id)}
                />
              )}
            </li>
          ))}
          {lots.length === 0 && (
            <li className="p-8 text-center text-muted">
              No lots set aside yet. Mark items as live lots when you add or edit them.
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}
