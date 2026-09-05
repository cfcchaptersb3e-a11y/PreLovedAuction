"use client";

import { setEventStatus } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import type { EventStatus } from "@prisma/client";

export function EventStatusButtons({
  eventId,
  status,
}: {
  eventId: string;
  status: EventStatus;
}) {
  if (status === "DRAFT") {
    return (
      <ConfirmButton
        className="btn-primary btn-sm"
        label="Open for bidding"
        pendingLabel="Opening…"
        confirm="Open this auction? All of its draft items go live and bidders can start bidding."
        action={() => setEventStatus(eventId, "OPEN")}
      />
    );
  }

  if (status === "OPEN") {
    return (
      <ConfirmButton
        className="btn-danger btn-sm"
        label="Close auction"
        pendingLabel="Closing…"
        confirm="Close this auction now? Every item still running is ended immediately and winners are notified."
        action={() => setEventStatus(eventId, "CLOSED")}
      />
    );
  }

  return (
    <ConfirmButton
      label="Re-open"
      pendingLabel="Re-opening…"
      confirm="Re-open this auction for bidding? Items that already ended stay ended."
      action={() => setEventStatus(eventId, "OPEN")}
    />
  );
}
