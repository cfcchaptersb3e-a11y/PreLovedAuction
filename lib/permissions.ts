import type { Role } from "@prisma/client";

/**
 * What each role is allowed to do.
 *
 * The point of these roles is blame-free delegation: a member helping with
 * photos before the auction cannot open it early or see who owes money, so
 * access can be handed out freely.
 *
 * This module is deliberately pure so both the server guards and the UI decide
 * from the same table — a button is hidden and the action is refused for the
 * same reason, and the two cannot drift apart.
 */

export type Capability =
  /** Create and change auctions, open and close them. */
  | "events"
  /** Add, edit, withdraw and end items; upload photos. */
  | "items"
  /** See winners' contact details, mark paid and collected, export the CSV. */
  | "payments"
  /** Run the live finale: start lots, record room bids, sell and pass. */
  | "live"
  /** Grant roles to other people. */
  | "people";

const CAPABILITIES: Record<Role, readonly Capability[]> = {
  BIDDER: [],
  CATALOGUER: ["items"],
  // The treasurer works the console during the live finale, so the auctioneer
  // can call the room while somebody else records the bids.
  TREASURER: ["payments", "live"],
  ADMIN: ["events", "items", "payments", "people", "live"],
};

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}

/** True for anyone with a reason to open the organizer tools at all. */
export function isStaff(role: Role): boolean {
  return CAPABILITIES[role].length > 0;
}

export const ROLE_LABELS: Record<Role, string> = {
  BIDDER: "Bidder",
  CATALOGUER: "Cataloger",
  TREASURER: "Treasurer",
  ADMIN: "Organizer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  BIDDER: "Can browse and bid. Everyone starts here.",
  CATALOGUER: "Adds and edits items and photos. Can't open or close an auction, or see payments.",
  TREASURER:
    "Runs the live auction console, works the winners list and marks payments. Can't change items or auctions.",
  ADMIN: "Full access, including granting these roles.",
};

/** In the order they should be offered, least access first. */
export const ASSIGNABLE_ROLES: readonly Role[] = ["BIDDER", "CATALOGUER", "TREASURER", "ADMIN"];

/**
 * Where to send someone after signing in, and where to bounce them if they
 * land on an organizer page their role can't open. Every staff role has a
 * page it can actually see, so nobody meets an error screen.
 */
export function staffLandingPath(role: Role): string {
  if (can(role, "items")) return "/admin";
  if (can(role, "payments")) return "/admin/winners";
  if (can(role, "people")) return "/admin/people";
  if (can(role, "live")) return "/admin/live";
  return "/";
}
