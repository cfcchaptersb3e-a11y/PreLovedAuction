"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createItem, updateItem, type AdminFormState } from "@/app/actions/admin";
import { DateTimeField } from "@/components/admin/DateTimeField";
import { ImageUploader } from "@/components/admin/ImageUploader";

type ItemValues = {
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
  isLiveLot: boolean;
  lotNumber: number | null;
};

const CONDITIONS = ["Like new", "Excellent", "Very good", "Good", "Well loved"];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function ItemForm({
  eventId,
  item,
  currency,
  defaultEndsAt,
  categories,
  onDone,
}: {
  eventId: string;
  item?: ItemValues;
  currency: string;
  defaultEndsAt: Date | null;
  categories: string[];
  onDone?: () => void;
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(
    item ? updateItem : createItem,
    {}
  );
  const [images, setImages] = useState<string[]>(item?.imageUrls ?? []);

  // After a successful create the form is reset so the next item can be typed
  // straight in — organizers usually add many items in one sitting.
  const created = Boolean(state.message && !item);

  return (
    <form
      action={action}
      key={created ? state.message : "form"}
      className="space-y-4"
      onSubmit={() => {
        if (!item) setTimeout(() => setImages([]), 0);
      }}
    >
      {item ? (
        <input type="hidden" name="itemId" value={item.id} />
      ) : (
        <input type="hidden" name="eventId" value={eventId} />
      )}
      <input type="hidden" name="imageUrls" value={images.join("\n")} />

      <div>
        <label className="label" htmlFor="title">
          Item title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={item?.title}
          placeholder="Vintage leather handbag"
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={item?.description ?? ""}
          placeholder="Size, color, brand, any marks or wear — be honest, bidders appreciate it."
          className="field"
        />
      </div>

      <ImageUploader value={images} onChange={setImages} />

      <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="donorName">
            Provided by
          </label>
          <input
            id="donorName"
            name="donorName"
            defaultValue={item?.donorName ?? ""}
            placeholder="The Cruz family"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <input
            id="category"
            name="category"
            list="category-options"
            defaultValue={item?.category ?? ""}
            placeholder="Bags, Books, Kitchen…"
            className="field"
          />
          <datalist id="category-options">
            {categories.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="condition">
            Condition
          </label>
          <select id="condition" name="condition" defaultValue={item?.condition ?? ""} className="field">
            <option value="">Not specified</option>
            {CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="startingBid">
            Starting bid ({currency})
          </label>
          <input
            id="startingBid"
            name="startingBid"
            inputMode="decimal"
            defaultValue={item ? (item.startingBidCents / 100).toString() : "100"}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="bidIncrement">
            Bid increment
          </label>
          <input
            id="bidIncrement"
            name="bidIncrement"
            inputMode="decimal"
            defaultValue={item ? (item.bidIncrementCents / 100).toString() : "50"}
            className="field"
          />
          <p className="hint">Smallest step up.</p>
        </div>
        <div>
          <label className="label" htmlFor="reserve">
            Reserve (optional)
          </label>
          <input
            id="reserve"
            name="reserve"
            inputMode="decimal"
            defaultValue={item?.reserveCents ? (item.reserveCents / 100).toString() : ""}
            className="field"
          />
          <p className="hint">Hidden minimum to sell.</p>
        </div>
        <DateTimeField
          id="endsAt"
          name="endsAt"
          label="Closes"
          iso={(item?.endsAt ?? defaultEndsAt)?.toISOString() ?? null}
        />
      </div>

      <div className="rounded-xl border border-line bg-parchment/50 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="isLiveLot"
            defaultChecked={item?.isLiveLot ?? false}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>
            <span className="font-medium">Save this for the live auction</span>
            <span className="hint mt-0.5 block">
              Online bidding still runs and sets the opening price, but the lot doesn&rsquo;t close
              on its own — the auctioneer sells it at the event.
            </span>
          </span>
        </label>
        <div className="mt-3 max-w-[10rem]">
          <label className="label" htmlFor="lotNumber">
            Lot number
          </label>
          <input
            id="lotNumber"
            name="lotNumber"
            inputMode="numeric"
            defaultValue={item?.lotNumber ?? ""}
            placeholder="1"
            className="field"
          />
          <p className="hint">The order the auctioneer calls them.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={item ? "Save item" : "Add item"} />
        {onDone && (
          <button type="button" className="btn-secondary" onClick={onDone}>
            Done
          </button>
        )}
        {state.message && <span className="text-sm text-forest">{state.message}</span>}
        {state.error && <span className="text-sm text-clay">{state.error}</span>}
      </div>
    </form>
  );
}
