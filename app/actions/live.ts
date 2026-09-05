"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability, getCurrentUser } from "@/lib/auth";
import { BidError, placeBid } from "@/lib/auction";
import { sendWinnerEmail } from "@/lib/email";
import { parseMoneyToCents } from "@/lib/money";

export type LiveFormState = { error?: string; message?: string };

function refresh(): void {
  revalidatePath("/live");
  revalidatePath("/admin/live");
  revalidatePath("/");
}

/** Puts the auctioneer on a lot, and opens it for bidding. */
export async function openLot(itemId: string): Promise<void> {
  await requireCapability("live");

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item || !item.isLiveLot) throw new Error("That isn't a live lot.");
  if (item.status === "ENDED") throw new Error("That lot has already been sold.");

  await db.$transaction([
    db.item.update({ where: { id: itemId }, data: { status: "LIVE" } }),
    db.auctionEvent.update({
      where: { id: item.eventId },
      data: { currentLotId: itemId },
    }),
  ]);
  refresh();
}

/** Steps away from the current lot without selling it. */
export async function closeLotWithoutSelling(eventId: string): Promise<void> {
  await requireCapability("live");
  await db.auctionEvent.update({ where: { id: eventId }, data: { currentLotId: null } });
  refresh();
}

/** A bid called in the room, entered by the operator. */
export async function placeRoomBid(
  _prev: LiveFormState,
  formData: FormData
): Promise<LiveFormState> {
  await requireCapability("live");

  const itemId = String(formData.get("itemId") ?? "");
  const label = String(formData.get("bidderLabel") ?? "").trim();
  const amountCents = parseMoneyToCents(String(formData.get("amount") ?? ""));

  if (!label) return { error: "Say who bid — a name, or a paddle number." };
  if (amountCents === null) return { error: "Enter the amount that was called." };

  try {
    await placeBid({ itemId, bidderLabel: label, channel: "ROOM", amountCents });
    refresh();
    // Deliberately no amount or name: the panel above shows the live figure,
    // and a message naming a price goes stale the moment the next bid lands.
    return { message: "Bid recorded." };
  } catch (error) {
    if (error instanceof BidError) return { error: error.message };
    console.error("Room bid failed:", error);
    return { error: "That bid didn't go through. Try again." };
  }
}

/** A bid from someone watching at home. */
export async function placeOnlineLiveBid(
  _prev: LiveFormState,
  formData: FormData
): Promise<LiveFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to bid." };

  const itemId = String(formData.get("itemId") ?? "");
  const amountCents = parseMoneyToCents(String(formData.get("amount") ?? ""));
  if (amountCents === null) return { error: "Enter your bid." };

  try {
    await placeBid({ itemId, userId: user.id, channel: "ONLINE", amountCents });
    refresh();
    return { message: "You're the highest bidder!" };
  } catch (error) {
    if (error instanceof BidError) return { error: error.message };
    console.error("Live online bid failed:", error);
    return { error: "That bid didn't go through. Try again." };
  }
}

/** Sold. Awards the lot to whoever holds the top bid. */
export async function sellLot(itemId: string): Promise<void> {
  await requireCapability("live");

  const item = await db.item.findUnique({ where: { id: itemId }, include: { event: true } });
  if (!item) throw new Error("That lot no longer exists.");

  const top = await db.bid.findFirst({
    where: { itemId },
    orderBy: [{ amountCents: "desc" }, { createdAt: "asc" }],
    include: { user: true },
  });

  if (!top) {
    throw new Error("Nobody has bid on this lot yet. Use “No sale” to pass on it.");
  }
  if (item.reserveCents && top.amountCents < item.reserveCents) {
    throw new Error(
      "That bid is below the reserve. Keep going, or use “No sale” to pass on the lot."
    );
  }

  await db.$transaction([
    db.item.update({
      where: { id: itemId },
      data: {
        status: "ENDED",
        winnerId: top.userId,
        winnerLabel: top.bidderLabel,
        winningBidCents: top.amountCents,
      },
    }),
    db.auctionEvent.update({ where: { id: item.eventId }, data: { currentLotId: null } }),
  ]);

  // Never let a mail problem stop the auctioneer moving on.
  if (top.user) {
    try {
      await sendWinnerEmail({
        to: top.user.email,
        itemTitle: item.title,
        itemId: item.id,
        amountCents: top.amountCents,
        currency: item.event.currency,
        paymentInstructions: item.event.paymentInstructions,
      });
    } catch (error) {
      console.error(`WINNER EMAIL FAILED for ${top.user.email} on lot ${item.id}:`, error);
    }
  }
  refresh();
}

/** Passed in: no bid met the reserve, or nobody bid. */
export async function passLot(itemId: string): Promise<void> {
  await requireCapability("live");
  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) return;

  await db.$transaction([
    db.item.update({
      where: { id: itemId },
      data: { status: "ENDED", winnerId: null, winnerLabel: null, winningBidCents: null },
    }),
    db.auctionEvent.update({ where: { id: item.eventId }, data: { currentLotId: null } }),
  ]);
  refresh();
}
