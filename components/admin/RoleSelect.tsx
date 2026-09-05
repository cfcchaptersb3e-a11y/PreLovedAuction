"use client";

import { useState, useTransition } from "react";
import { setUserRole } from "@/app/actions/admin";
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export function RoleSelect({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: Role;
  isSelf: boolean;
}) {
  const [current, setCurrent] = useState<Role>(role);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return (
      <span className="chip bg-forest-light text-forest" title="Ask another organizer to change this">
        {ROLE_LABELS[current]} (you)
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <select
        aria-label="Role"
        className="field max-w-[11rem] py-1.5 text-xs"
        value={current}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as Role;
          const previous = current;
          if (
            next === "ADMIN" &&
            !window.confirm(
              "Give this person full organizer access? They'll be able to manage auctions, items, payments and other people's roles."
            )
          ) {
            return;
          }
          setCurrent(next);
          setError(null);
          start(async () => {
            try {
              await setUserRole(userId, next);
            } catch (caught) {
              setCurrent(previous);
              setError(caught instanceof Error ? caught.message : "That didn't work.");
            }
          });
        }}
      >
        {ASSIGNABLE_ROLES.map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>
      <span className="max-w-[16rem] text-[11px] leading-snug text-muted">
        {pending ? "Saving…" : ROLE_DESCRIPTIONS[current]}
      </span>
      {error && <span className="max-w-[16rem] text-xs text-clay">{error}</span>}
    </span>
  );
}
