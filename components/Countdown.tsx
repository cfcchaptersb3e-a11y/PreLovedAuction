"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { timeLeft } from "@/lib/time";

/**
 * Ticks locally so the remaining time stays honest without polling the server.
 * The server-rendered value is used for the first paint to avoid a hydration
 * mismatch, then the clock takes over.
 *
 * When the clock runs out it refreshes the page once. That re-runs the server
 * render, which settles the item and emails its winner — so an auction closes
 * the moment it ends for anyone watching, rather than waiting for the daily
 * cron backstop.
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
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    setLabel(timeLeft(endsAt));

    // Already over: whatever the server rendered is authoritative.
    if (Date.now() >= end) return;

    let refresh: ReturnType<typeof setTimeout> | undefined;

    const timer = setInterval(() => {
      setLabel(timeLeft(endsAt));
      if (Date.now() < end) return;

      clearInterval(timer);
      if (refreshed.current) return;
      refreshed.current = true;
      // A page can hold many countdowns ending together; stagger the reloads
      // so they don't all hit the server in the same instant.
      refresh = setTimeout(() => router.refresh(), Math.random() * 3000);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (refresh) clearTimeout(refresh);
    };
  }, [endsAt, router]);

  const urgent = new Date(endsAt).getTime() - Date.now() < 60 * 60 * 1000;

  return (
    <span className={className ?? (urgent ? "font-semibold text-clay" : "text-muted")}>{label}</span>
  );
}
