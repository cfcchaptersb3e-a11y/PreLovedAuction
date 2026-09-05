"use client";

import { useTransition } from "react";
import { toggleWatch } from "@/app/actions/bids";

export function WatchButton({
  itemId,
  watching,
  fullWidth = false,
}: {
  itemId: string;
  watching: boolean;
  fullWidth?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={watching}
      onClick={() => start(() => toggleWatch(itemId))}
      className={`btn-secondary ${fullWidth ? "w-full" : ""} ${watching ? "border-gold/50 text-gold" : ""}`}
    >
      <span aria-hidden>{watching ? "★" : "☆"}</span>
      {pending ? "Saving…" : watching ? "Watching" : "Watch this item"}
    </button>
  );
}
