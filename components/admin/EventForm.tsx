"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createEvent, updateEvent, type AdminFormState } from "@/app/actions/admin";
import { DateTimeField } from "@/components/admin/DateTimeField";

type EventValues = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  currency: string;
  goalCents: number;
  startsAt: Date | null;
  endsAt: Date | null;
  paymentInstructions: string | null;
  pickupInstructions: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function EventForm({ event }: { event?: EventValues }) {
  const [state, action] = useActionState<AdminFormState, FormData>(
    event ? updateEvent : createEvent,
    {}
  );

  return (
    <form action={action} className="space-y-5">
      {event && <input type="hidden" name="eventId" value={event.id} />}

      <div>
        <label className="label" htmlFor="name">
          Auction name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={event?.name}
          placeholder="CFC SB3E Pre-Loved Auction 2026"
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="tagline">
          Tagline
        </label>
        <input
          id="tagline"
          name="tagline"
          defaultValue={event?.tagline ?? ""}
          placeholder="Pre-loved treasures from our members, for our chapter"
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          What are we raising funds for?
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={event?.description ?? ""}
          className="field"
        />
        <p className="hint">Shown on the auction home page. A sentence or two is plenty.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="goal">
            Fundraising goal
          </label>
          <input
            id="goal"
            name="goal"
            inputMode="decimal"
            defaultValue={event ? (event.goalCents / 100).toString() : ""}
            placeholder="50000"
            className="field"
          />
          <p className="hint">Leave blank to hide the goal bar.</p>
        </div>
        <div>
          <label className="label" htmlFor="currency">
            Currency
          </label>
          <select id="currency" name="currency" defaultValue={event?.currency ?? "PHP"} className="field">
            {["PHP", "USD", "CAD", "AUD", "SGD", "EUR", "GBP", "AED", "HKD", "NZD"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <DateTimeField
          id="endsAt"
          name="endsAt"
          label="Default closing time"
          hint="Used for items that don&rsquo;t set their own."
          iso={event?.endsAt ? new Date(event.endsAt).toISOString() : null}
        />
      </div>

      <DateTimeField
        id="startsAt"
        name="startsAt"
        label="Opening date (for display)"
        iso={event?.startsAt ? new Date(event.startsAt).toISOString() : null}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="paymentInstructions">
            Payment instructions
          </label>
          <textarea
            id="paymentInstructions"
            name="paymentInstructions"
            rows={4}
            defaultValue={event?.paymentInstructions ?? ""}
            placeholder={"GCash: 0917 123 4567 (Maria S.)\nBank: BPI 1234-5678-90\nPlease send a screenshot of your payment to the chapter group."}
            className="field"
          />
          <p className="hint">Emailed to each winner and shown on their account page.</p>
        </div>
        <div>
          <label className="label" htmlFor="pickupInstructions">
            Pickup instructions
          </label>
          <textarea
            id="pickupInstructions"
            name="pickupInstructions"
            rows={4}
            defaultValue={event?.pickupInstructions ?? ""}
            placeholder="Items can be collected after the Sunday household meeting, or we can arrange delivery within the area."
            className="field"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={event ? "Save changes" : "Create auction"} />
        {state.message && <span className="text-sm text-forest">{state.message}</span>}
        {state.error && <span className="text-sm text-clay">{state.error}</span>}
      </div>
    </form>
  );
}
