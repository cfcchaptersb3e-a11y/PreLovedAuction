import type { Prisma } from "@prisma/client";

/**
 * How the item lists are searched, filtered and ordered.
 *
 * Shared by the home page and by each auction's own page so the two cannot
 * drift into answering the same question differently.
 */

export const ITEM_SORTS = {
  ending: { label: "Ending soonest", orderBy: { endsAt: "asc" } },
  newest: { label: "Newest first", orderBy: { createdAt: "desc" } },
  title: { label: "A–Z", orderBy: { title: "asc" } },
} as const satisfies Record<string, { label: string; orderBy: Prisma.ItemOrderByWithRelationInput }>;

export type ItemSortKey = keyof typeof ITEM_SORTS;

export function sortKeyFrom(raw: string | undefined): ItemSortKey {
  return raw && raw in ITEM_SORTS ? (raw as ItemSortKey) : "ending";
}

/** Which items somebody wants to see on an auction that holds both. */
export const ITEM_STATUS_FILTERS = {
  all: { label: "All items", statuses: ["LIVE", "ENDED"] },
  live: { label: "Still open", statuses: ["LIVE"] },
  ended: { label: "Sold & ended", statuses: ["ENDED"] },
} as const;

export type ItemStatusFilter = keyof typeof ITEM_STATUS_FILTERS;

export function statusFilterFrom(raw: string | undefined): ItemStatusFilter {
  return raw && raw in ITEM_STATUS_FILTERS ? (raw as ItemStatusFilter) : "all";
}

/**
 * The text search. Matches the title, the description and who provided the
 * item, because "the Cruz family's bag" is how people actually remember them.
 */
export function itemTextSearch(query: string): Prisma.ItemWhereInput | Record<string, never> {
  if (!query) return {};
  return {
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { donorName: { contains: query, mode: "insensitive" } },
    ],
  };
}
