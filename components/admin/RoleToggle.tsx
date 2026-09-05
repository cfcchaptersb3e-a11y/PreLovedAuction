"use client";

import { setUserRole } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export function RoleToggle({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  return (
    <ConfirmButton
      className={isAdmin ? "btn-danger btn-sm" : "btn-secondary btn-sm"}
      label={isAdmin ? "Remove admin" : "Make admin"}
      confirm={
        isAdmin
          ? "Remove organiser access from this person?"
          : "Give this person full organiser access? They'll be able to manage auctions, items and payments."
      }
      action={() => setUserRole(userId, !isAdmin)}
    />
  );
}
