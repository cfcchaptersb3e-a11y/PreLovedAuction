import "server-only";
import { db } from "@/lib/db";
import { minimumBidCents } from "@/lib/auction";
import { bidderName } from "@/lib/identity";
import type { AuctionEvent, Item } from "@prisma/client";

/**
 * The live finale: a handful of lots held back from the online close and sold
 * by an auctioneer at a gathering, with people in the room and people at home
 * bidding into the same lot.
 *
 * There is deliberately no realtime transport. Only the current lot's state
 * matters, everyone reads it by polling, and the operator's device is the one
 * that must not be blocked. That means a network wobble delays an update
 * rather than stopping the auction, and if the hall's connection fails
 * altogether the operator can keep calling lots on paper and enter them after.
 */

export type LotView = {
  item: Item;
  currentBidCents: number;
  minimumBidCents: number;
  bidCount: number;
  leader: string | null;
  isRunning: boolean;
};

/** Everything the live page needs, in one read. */
export async function getLiveState(event: AuctionEvent): Promise<{
  lots: Item[];
  current: LotView | null;
}> {
  const lots = await db.item.findMany({
    where: { eventId: event.id, isLiveLot: true, status: { in: ["DRAFT", "LIVE", "ENDED"] } },
    orderBy: [{ lotNumber: "asc" }, { createdAt: "asc" }],
  });

  const current = event.currentLotId
    ? (lots.find((lot) => lot.id === event.currentLotId) ?? null)
    : null;

  return { lots, current: current ? await describeLot(current) : null };
}

export async function describeLot(item: Item): Promise<LotView> {
  const [top, bidCount] = await Promise.all([
    db.bid.findFirst({
      where: { itemId: item.id },
      orderBy: [{ amountCents: "desc" }, { createdAt: "asc" }],
      include: { user: { select: { name: true, email: true, mobile: true } } },
    }),
    db.bid.count({ where: { itemId: item.id } }),
  ]);

  return {
    item,
    currentBidCents: top?.amountCents ?? 0,
    minimumBidCents: minimumBidCents(item, top?.amountCents ?? null),
    bidCount,
    leader: top ? describeBidder(top.bidderLabel, top.user) : null,
    isRunning: item.status === "LIVE",
  };
}

/**
 * Bidders are shown to each other by first name and initial. Neither a full
 * email address nor a full mobile number is ever put on the screen — the room
 * can see this page.
 */
export function describeBidder(
  label: string | null,
  user?: { name?: string | null; email?: string | null; mobile?: string | null } | null
): string {
  if (label) return label;
  if (!user) return "A bidder";
  return bidderName(user);
}
