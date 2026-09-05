"use client";

import { useState } from "react";
import Link from "next/link";
import { ItemForm } from "@/components/admin/ItemForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteItem, setItemStatus } from "@/app/actions/admin";
import { formatMoney } from "@/lib/money";
import { LocalTime } from "@/components/LocalTime";

export type ManagedItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  condition: string | null;
  donorName: string | null;
  imageUrls: string[];
  startingBidCents: number;
  bidIncrementCents: number;
  reserveCents: number | null;
  endsAt: Date;
  status: string;
  isLiveLot: boolean;
  lotNumber: number | null;
  winningBidCents: number | null;
  bidCount: number;
  topBidCents: number;
  winnerLabel: string | null;
};

export function ItemManager({
  eventId,
  items,
  currency,
  defaultEndsAt,
  categories,
  canWithdraw,
}: {
  eventId: string;
  items: ManagedItem[];
  currency: string;
  defaultEndsAt: Date | null;
  categories: string[];
  /** Withdrawing is an organizer's call, so the button is theirs alone. */
  canWithdraw: boolean;
}) {
  const [adding, setAdding] = useState(items.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="mr-auto text-lg font-bold">
          Items <span className="text-sm font-normal text-muted">({items.length})</span>
        </h3>
        <button
          type="button"
          className={adding ? "btn-secondary" : "btn-primary"}
          onClick={() => setAdding((value) => !value)}
        >
          {adding ? "Hide form" : "+ Add item"}
        </button>
      </div>

      {adding && (
        <div className="card border-forest/30 bg-forest-light/40 p-5">
          <h4 className="mb-4 font-semibold">Add an item</h4>
          <ItemForm
            eventId={eventId}
            currency={currency}
            defaultEndsAt={defaultEndsAt}
            categories={categories}
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          <p>No items yet. Add the first provided item above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            editingId === item.id ? (
              <div key={item.id} className="card border-forest/30 p-5">
                <h4 className="mb-4 font-semibold">Editing “{item.title}”</h4>
                <ItemForm
                  eventId={eventId}
                  item={item}
                  currency={currency}
                  defaultEndsAt={defaultEndsAt}
                  categories={categories}
                  onDone={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div key={item.id} className="card flex flex-wrap items-center gap-4 p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-parchment">
                  {item.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-xl text-muted/40" aria-hidden>
                      🎁
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/items/${item.id}`} className="font-semibold hover:underline">
                      {item.title}
                    </Link>
                    {item.isLiveLot && (
                      <span className="chip bg-clay-light text-clay">
                        Live lot{item.lotNumber ? ` ${item.lotNumber}` : ""}
                      </span>
                    )}
                    <span
                      className={`chip ${
                        item.status === "LIVE"
                          ? "bg-forest-light text-forest"
                          : item.status === "DRAFT"
                            ? "bg-clay-light text-clay"
                            : "bg-parchment text-muted"
                      }`}
                    >
                      {item.status === "LIVE"
                        ? "Live"
                        : item.status === "DRAFT"
                          ? "Draft"
                          : item.status === "CANCELLED"
                            ? "Withdrawn"
                            : "Ended"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {item.bidCount} {item.bidCount === 1 ? "bid" : "bids"} ·{" "}
                    {item.status === "ENDED"
                      ? item.winningBidCents
                        ? `won at ${formatMoney(item.winningBidCents, currency)} by ${item.winnerLabel}`
                        : "no winner"
                      : formatMoney(item.topBidCents || item.startingBidCents, currency)}
                    {item.status !== "ENDED" && (
                      <>
                        {" · closes "}
                        <LocalTime
                          iso={item.endsAt.toISOString()}
                          fallback={`${item.endsAt.toISOString().slice(0, 16).replace("T", " ")} UTC`}
                        />
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setEditingId(item.id)}
                  >
                    Edit
                  </button>

                  {item.status === "DRAFT" && (
                    <ConfirmButton
                      label="Put live"
                      action={() => setItemStatus(item.id, "LIVE")}
                    />
                  )}
                  {item.status === "LIVE" && (
                    <ConfirmButton
                      label="End now"
                      confirm="End bidding on this item now and award it to the highest bidder?"
                      action={() => setItemStatus(item.id, "ENDED")}
                    />
                  )}
                  {canWithdraw && (item.status === "LIVE" || item.status === "DRAFT") && (
                    <ConfirmButton
                      className="btn-danger btn-sm"
                      label="Withdraw"
                      confirm="Withdraw this item from the auction? Any bids on it will not win."
                      action={() => setItemStatus(item.id, "CANCELLED")}
                    />
                  )}
                  {canWithdraw && item.status === "CANCELLED" && (
                    <ConfirmButton label="Restore" action={() => setItemStatus(item.id, "LIVE")} />
                  )}
                  {item.bidCount === 0 && (
                    <ConfirmButton
                      className="btn-danger btn-sm"
                      label="Delete"
                      confirm="Permanently delete this item?"
                      action={() => deleteItem(item.id)}
                    />
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
