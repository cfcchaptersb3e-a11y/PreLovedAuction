"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitBid, type BidFormState } from "@/app/actions/bids";
import { formatMoney } from "@/lib/money";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Placing bid…" : label}
    </button>
  );
}

export function BidForm({
  itemId,
  minimumCents,
  incrementCents,
  currency,
}: {
  itemId: string;
  minimumCents: number;
  incrementCents: number;
  currency: string;
}) {
  const [state, action] = useActionState<BidFormState, FormData>(submitBid, {});
  const [amount, setAmount] = useState((minimumCents / 100).toString());

  // A successful bid raises the minimum, so refresh the suggested amount.
  useEffect(() => {
    setAmount((minimumCents / 100).toString());
  }, [minimumCents]);

  const quickBids = [0, 1, 2].map((step) => minimumCents + step * incrementCents);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="itemId" value={itemId} />

      <div>
        <label className="label" htmlFor="amount">
          Your bid
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted">{currency}</span>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="field"
          />
        </div>
        <p className="hint">Minimum bid is {formatMoney(minimumCents, currency)}.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickBids.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setAmount((value / 100).toString())}
            className="btn-secondary btn-sm"
          >
            {formatMoney(value, currency)}
          </button>
        ))}
      </div>

      <SubmitButton label="Place bid" />

      {state.error && (
        <p className="rounded-lg bg-clay-light px-3 py-2 text-sm text-clay" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-lg bg-forest-light px-3 py-2 text-sm font-medium text-forest" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
