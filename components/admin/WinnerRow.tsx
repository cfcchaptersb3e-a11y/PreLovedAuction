"use client";

import { useTransition } from "react";
import { setHandoverStatus, setPaymentStatus } from "@/app/actions/admin";

export function StatusToggle({
  itemId,
  kind,
  done,
}: {
  itemId: string;
  kind: "payment" | "handover";
  done: boolean;
}) {
  const [pending, start] = useTransition();

  const label =
    kind === "payment" ? (done ? "Paid" : "Mark paid") : done ? "Collected" : "Mark collected";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (kind === "payment") await setPaymentStatus(itemId, !done);
          else await setHandoverStatus(itemId, !done);
        })
      }
      className={`chip transition ${
        done
          ? "bg-forest-light text-forest hover:bg-forest hover:text-white"
          : "border border-line bg-white text-muted hover:border-forest hover:text-forest"
      } ${pending ? "opacity-50" : ""}`}
      title={done ? "Click to undo" : undefined}
    >
      {done && <span aria-hidden>✓</span>} {pending ? "…" : label}
    </button>
  );
}
