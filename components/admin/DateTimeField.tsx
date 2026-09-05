"use client";

import { useEffect, useState } from "react";

/**
 * A date-and-time picker that submits an absolute ISO timestamp.
 *
 * A bare `datetime-local` input posts a naive string like "2026-09-08T18:00",
 * which the server would read in *its* timezone — on Vercel that is UTC, so an
 * organizer in Manila setting 6pm would close the item at 2am. This converts
 * the value in the browser, where the intended timezone actually lives.
 */
export function DateTimeField({
  id,
  name,
  iso,
  label,
  hint,
}: {
  id: string;
  name: string;
  iso: string | null;
  label: string;
  hint?: string;
}) {
  const [local, setLocal] = useState("");

  // Filled in after mount so the server and client render the same empty input.
  useEffect(() => {
    if (!iso) return;
    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, "0");
    setLocal(
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
        date.getHours()
      )}:${pad(date.getMinutes())}`
    );
  }, [iso]);

  const absolute = local ? new Date(local) : null;

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        className="field"
      />
      <input
        type="hidden"
        name={name}
        value={absolute && !Number.isNaN(absolute.getTime()) ? absolute.toISOString() : ""}
      />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
