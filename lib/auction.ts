import "server-only";
import { db } from "@/lib/db";
import { sendOutbidEmail, sendWinnerEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import type { AuctionEvent, Item, Prisma } from "@prisma/client";

/**
 * A bid placed inside this window pushes the closing time out, so an item can
 * never be won by sniping in the final seconds. Everyone gets a chance to
 * respond, which is both fairer and better for the fundraising total.
 */
export const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000;
export const ANTI_SNIPE_EXTENSION_MS = 2 * 60 * 1000;

export class BidError extends Error {}

export type BidResult = {
  amountCents: number;
  newEndsAt: Date;
  extended: boolean;
};

/** Smallest bid that would currently be accepted on an item. */
export function minimumBidCents(
  item: Pick<Item, "startingBidCents" | "bidIncrementCents">,
  topBidCents: number | null
): number {
  return topBidCents === null ? item.startingBidCents : topBidCents + item.bidIncrementCents;
}

/**
 * Places a bid. Runs at serializable isolation and retries on the write
 * conflicts Postgres raises when two people bid at the same instant, so the
 * "highest bid" a bidder was shown is the one they actually beat.
 */
export async function placeBid(params: {
  itemId: string;
  userId: string;
  amountCents: number;
}): Promise<BidResult> {
  const { itemId, userId, amountCents } = params;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new BidError("Enter a valid bid amount.");
  }

  let outbid: { email: string; itemTitle: string; currency: string } | null = null;
  let result: BidResult | null = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const outcome = await db.$transaction(
        async (tx) => {
          const item = await tx.item.findUnique({
            where: { id: itemId },
            include: { event: true },
          });
          if (!item) throw new BidError("That item no longer exists.");
          if (item.status !== "LIVE") throw new BidError("This item is not open for bidding.");
          if (item.event.status !== "OPEN") throw new BidError("This auction is not running.");

          const now = new Date();
          if (item.endsAt <= now) throw new BidError("Bidding on this item has closed.");

          const topBid = await tx.bid.findFirst({
            where: { itemId },
            orderBy: [{ amountCents: "desc" }, { createdAt: "asc" }],
            include: { user: true },
          });

          if (topBid && topBid.userId === userId) {
            throw new BidError("You are already the highest bidder on this item.");
          }

          const minimum = minimumBidCents(item, topBid?.amountCents ?? null);
          if (amountCents < minimum) {
            throw new BidError(
              `Your bid must be at least ${formatMoney(minimum, item.event.currency)}. Someone may have bid just before you.`
            );
          }

          await tx.bid.create({ data: { itemId, userId, amountCents } });

          let newEndsAt = item.endsAt;
          let extended = false;
          if (item.endsAt.getTime() - now.getTime() < ANTI_SNIPE_WINDOW_MS) {
            newEndsAt = new Date(now.getTime() + ANTI_SNIPE_EXTENSION_MS);
            extended = true;
            await tx.item.update({ where: { id: itemId }, data: { endsAt: newEndsAt } });
          }

          return {
            bid: { amountCents, newEndsAt, extended },
            previousTopBidder:
              topBid && topBid.user.email
                ? { email: topBid.user.email, itemTitle: item.title, currency: item.event.currency }
                : null,
          };
        },
        { isolationLevel: "Serializable" }
      );

      result = outcome.bid;
      outbid = outcome.previousTopBidder;
      break;
    } catch (error) {
      if (error instanceof BidError) throw error;
      if (isRetryableWriteConflict(error) && attempt < 3) continue;
      throw error;
    }
  }

  if (!result) throw new BidError("Too many bids landed at once. Please try again.");

  if (outbid) {
    // The bid is already placed; a failed notification must not undo it.
    try {
      await sendOutbidEmail({
        to: outbid.email,
        itemTitle: outbid.itemTitle,
        itemId,
        newAmountCents: result.amountCents,
        currency: outbid.currency,
      });
    } catch (error) {
      console.error(
        `OUTBID EMAIL FAILED for ${outbid.email} on item ${itemId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return result;
}

function isRetryableWriteConflict(error: unknown): boolean {
  const code = (error as Prisma.PrismaClientKnownRequestError | undefined)?.code;
  // P2034: write conflict / deadlock detected — the documented retry signal.
  return code === "P2034";
}

/**
 * Closes every live item whose end time has passed, awarding it to the top
 * bidder (unless a reserve price was not met) and emailing the winner.
 *
 * Safe to call often: it is idempotent, and it is called both by the scheduled
 * job and lazily when pages are viewed, so results are correct even if the
 * scheduled job has not run yet.
 */
export async function finalizeDueItems(): Promise<number> {
  const due = await db.item.findMany({
    where: { status: "LIVE", endsAt: { lte: new Date() } },
    include: { event: true },
    take: 200,
  });
  if (due.length === 0) return 0;

  let closed = 0;
  for (const item of due) {
    const winner = await closeItem(item, item.event);
    if (winner) {
      // The item is settled either way; the winner is also shown on their
      // account page and in the organizers' winners report.
      try {
        await sendWinnerEmail({
          to: winner.email,
          itemTitle: item.title,
          itemId: item.id,
          amountCents: winner.amountCents,
          currency: item.event.currency,
          paymentInstructions: item.event.paymentInstructions,
        });
      } catch (error) {
        console.error(
          `WINNER EMAIL FAILED for ${winner.email} on item ${item.id} ("${item.title}") — contact them directly:`,
          error instanceof Error ? error.message : error
        );
      }
    }
    closed++;
  }
  return closed;
}

async function closeItem(
  item: Item,
  event: AuctionEvent
): Promise<{ email: string; amountCents: number } | null> {
  const topBid = await db.bid.findFirst({
    where: { itemId: item.id },
    orderBy: [{ amountCents: "desc" }, { createdAt: "asc" }],
    include: { user: true },
  });

  const reserveMet = !item.reserveCents || (topBid?.amountCents ?? 0) >= item.reserveCents;
  const sold = Boolean(topBid) && reserveMet;

  // The guard on `status` makes this a no-op if another request closed it first.
  const updated = await db.item.updateMany({
    where: { id: item.id, status: "LIVE" },
    data: {
      status: "ENDED",
      winnerId: sold ? topBid!.userId : null,
      winningBidCents: sold ? topBid!.amountCents : null,
    },
  });

  if (updated.count === 0 || !sold) return null;
  void event;
  return { email: topBid!.user.email, amountCents: topBid!.amountCents };
}

/** The auction currently being promoted on the home page. */
export async function getActiveEvent(): Promise<AuctionEvent | null> {
  return (
    (await db.auctionEvent.findFirst({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
    })) ??
    (await db.auctionEvent.findFirst({
      where: { status: "CLOSED" },
      orderBy: { createdAt: "desc" },
    }))
  );
}

export type EventTotals = {
  raisedCents: number;
  collectedCents: number;
  goalCents: number;
  percent: number;
  itemsSold: number;
  itemsTotal: number;
  bidCount: number;
  bidderCount: number;
};

/**
 * Fundraising totals for one event only — a new event starts back at zero.
 * `raised` counts won items; `collected` counts the ones marked paid.
 */
export async function getEventTotals(eventId: string): Promise<EventTotals> {
  const [won, collected, itemsTotal, bidCount, bidders, event] = await Promise.all([
    db.item.aggregate({
      where: { eventId, status: "ENDED", winnerId: { not: null } },
      _sum: { winningBidCents: true },
      _count: true,
    }),
    db.item.aggregate({
      where: { eventId, status: "ENDED", winnerId: { not: null }, paymentStatus: "PAID" },
      _sum: { winningBidCents: true },
    }),
    db.item.count({ where: { eventId, status: { in: ["LIVE", "ENDED"] } } }),
    db.bid.count({ where: { item: { eventId } } }),
    db.bid.findMany({
      where: { item: { eventId } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    db.auctionEvent.findUnique({ where: { id: eventId } }),
  ]);

  const raisedCents = won._sum.winningBidCents ?? 0;
  const goalCents = event?.goalCents ?? 0;

  return {
    raisedCents,
    collectedCents: collected._sum.winningBidCents ?? 0,
    goalCents,
    percent: goalCents > 0 ? Math.min(100, Math.round((raisedCents / goalCents) * 100)) : 0,
    itemsSold: won._count,
    itemsTotal,
    bidCount,
    bidderCount: bidders.length,
  };
}

/** Current top bid per item, for list views. */
export async function getTopBids(itemIds: string[]): Promise<Map<string, { amountCents: number; count: number }>> {
  if (itemIds.length === 0) return new Map();
  const grouped = await db.bid.groupBy({
    by: ["itemId"],
    where: { itemId: { in: itemIds } },
    _max: { amountCents: true },
    _count: { _all: true },
  });
  return new Map(
    grouped.map((row) => [
      row.itemId,
      { amountCents: row._max.amountCents ?? 0, count: row._count._all },
    ])
  );
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "auction"
  );
}
