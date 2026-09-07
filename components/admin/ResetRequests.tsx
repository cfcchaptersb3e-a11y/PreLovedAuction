"use client";

import { useState, useTransition } from "react";
import { approveResetHelp, dismissResetHelp } from "@/app/actions/admin";
import { formatMobile } from "@/lib/identity";

export type ResetRequest = {
  id: string;
  mobile: string;
  email: string;
  createdAt: string;
  personName: string | null;
  hasAccount: boolean;
};

/**
 * Requests from people who sign in with a mobile number and cannot get back in.
 *
 * Approving is the whole security of it: the address is unverified, so an
 * organizer checks that the number and the person asking actually go together
 * before a link goes anywhere.
 */
export function ResetRequests({ requests }: { requests: ResetRequest[] }) {
  // Held here rather than in each row: the row has to keep saying what happened
  // to it after it is dealt with, and the count above has to stay honest.
  const [resolved, setResolved] = useState<Record<string, string>>({});

  if (requests.length === 0) return null;
  const waiting = requests.length - Object.keys(resolved).length;

  return (
    <section className="card border-gold/40 bg-clay-light p-4">
      <h3 className="font-semibold">
        Password help asked for{" "}
        <span className="text-sm font-normal text-muted">
          · {waiting === 0 ? "all dealt with" : `${waiting} waiting`}
        </span>
      </h3>
      <p className="mt-1 text-sm text-ink/80">
        These people sign in with a mobile number, so a reset link has nowhere to go until you
        approve an address. Check the number belongs to who you think it does before approving —
        anyone can type a number into that form.
      </p>
      <ul className="mt-3 space-y-3">
        {requests.map((request) => (
          <Row
            key={request.id}
            request={request}
            done={resolved[request.id]}
            onDone={(message) => setResolved((all) => ({ ...all, [request.id]: message }))}
          />
        ))}
      </ul>
    </section>
  );
}

function Row({
  request,
  done,
  onDone,
}: {
  request: ResetRequest;
  done?: string;
  onDone: (message: string) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <li className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted">
        {done}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-line bg-white p-3">
      <p className="font-medium">{request.personName ?? "Somebody"}</p>
      <p className="text-sm text-muted">
        signs in with {formatMobile(request.mobile)} · wants the link at{" "}
        <span className="break-all">{request.email}</span>
      </p>
      {!request.hasAccount && (
        <p className="mt-1 text-sm text-clay">
          No account uses that number — they may have mistyped it. Worth a call before you dismiss
          this.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={pending || !request.hasAccount}
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                const sentTo = await approveResetHelp(request.id);
                onDone(`Link sent to ${sentTo}, and that address is now on their account.`);
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "That didn't work.");
              }
            })
          }
        >
          {pending ? "Sending…" : "Approve and send"}
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                await dismissResetHelp(request.id);
                onDone("Dismissed.");
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "That didn't work.");
              }
            })
          }
        >
          Dismiss
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
    </li>
  );
}
