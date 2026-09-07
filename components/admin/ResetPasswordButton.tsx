"use client";

import { useState, useTransition } from "react";
import { issuePasswordReset } from "@/app/actions/admin";

/**
 * Gives an organizer a link that sets a new password on someone's account.
 *
 * Shown for every account, but it is the only route back in for somebody who
 * signed up with a mobile number and has nowhere to receive an emailed link.
 * The link is put on screen to be read out or texted, never emailed from here.
 */
export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  if (link) {
    return (
      <div className="space-y-2 rounded-lg border border-gold/40 bg-clay-light p-3">
        <p className="text-xs text-ink/80">
          Send this to {name}. It works once and expires in an hour.
        </p>
        <input readOnly value={link} className="field text-xs" onFocus={(e) => e.target.select()} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              navigator.clipboard?.writeText(link).then(
                () => setCopied(true),
                () => setCopied(false)
              );
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setLink(null)}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              setLink(await issuePasswordReset(userId));
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "That didn't work.");
            }
          })
        }
      >
        {pending ? "Making a link…" : "Reset password"}
      </button>
      {error && <span className="max-w-xs text-xs text-clay">{error}</span>}
    </span>
  );
}
