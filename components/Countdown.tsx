"use client";

import { useEffect, useState } from "react";
import { timeLeft } from "@/lib/time";

/**
 * Ticks locally so the remaining time stays honest without polling the server.
 * The server-rendered value is used for the first paint to avoid a hydration
 * mismatch, then the clock takes over.
 */
export function Countdown({
  endsAt,
  initialLabel,
  className,
}: {
  endsAt: string;
  initialLabel: string;
  className?: string;
}) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    const update = () => setLabel(timeLeft(endsAt));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const urgent = new Date(endsAt).getTime() - Date.now() < 60 * 60 * 1000;

  return (
    <span className={className ?? (urgent ? "font-semibold text-clay" : "text-muted")}>{label}</span>
  );
}
