"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * A button that runs a server action, asks for confirmation first when a
 * message is given, and surfaces any error the action throws instead of
 * failing silently.
 */
export function ConfirmButton({
  action,
  label,
  pendingLabel,
  confirm,
  redirectTo,
  className = "btn-secondary btn-sm",
}: {
  action: () => Promise<void>;
  label: string;
  pendingLabel?: string;
  confirm?: string;
  /** Where to go once the action succeeds, e.g. after deleting this page's record. */
  redirectTo?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            try {
              await action();
              if (redirectTo) router.push(redirectTo);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "That didn't work.");
            }
          });
        }}
      >
        {pending ? (pendingLabel ?? "Working…") : label}
      </button>
      {error && <span className="max-w-xs text-xs text-clay">{error}</span>}
    </span>
  );
}
