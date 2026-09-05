"use client";

import { useEffect, useState } from "react";

/**
 * Renders a timestamp in the viewer's own timezone. The server renders the
 * fallback (UTC), then the browser swaps in the local value after mount, so
 * the markup matches during hydration and a bidder in Manila, Toronto or
 * Dubai each sees their own clock.
 */
export function LocalTime({
  iso,
  fallback,
  dateOnly = false,
}: {
  iso: string;
  fallback: string;
  dateOnly?: boolean;
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(
      new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        ...(dateOnly ? {} : { timeStyle: "short" }),
      })
    );
  }, [iso, dateOnly]);

  return <time dateTime={iso}>{label ?? fallback}</time>;
}
