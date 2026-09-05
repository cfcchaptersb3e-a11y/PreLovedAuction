"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BidError, placeBid } from "@/lib/auction";
import { parseMoneyToCents } from "@/lib/money";

export type BidFormState = { error?: string; message?: string };

export async function submitBid(
  _prev: BidFormState,
  formData: FormData
): Promise<BidFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to place a bid." };

  const itemId = String(formData.get("itemId") ?? "");
  const amountCents = parseMoneyToCents(String(formData.get("amount") ?? ""));

  if (!itemId) return { error: "We couldn't tell which item this bid is for." };
  if (amountCents === null) return { error: "Enter your bid amount, for example 1500." };

  try {
    const result = await placeBid({ itemId, userId: user.id, amountCents });
    revalidatePath(`/items/${itemId}`);
    revalidatePath("/");
    revalidatePath("/watchlist");
    revalidatePath("/account");
    return {
      message: result.extended
        ? "You're the highest bidder. A late bid extended the closing time by 2 minutes."
        : "You're the highest bidder!",
    };
  } catch (error) {
    if (error instanceof BidError) return { error: error.message };
    console.error("Bid failed:", error);
    return { error: "Something went wrong placing that bid. Please try again." };
  }
}

export async function toggleWatch(itemId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const existing = await db.watch.findUnique({
    where: { userId_itemId: { userId: user.id, itemId } },
  });

  if (existing) {
    await db.watch.delete({ where: { id: existing.id } });
  } else {
    await db.watch.create({ data: { userId: user.id, itemId } });
  }

  revalidatePath(`/items/${itemId}`);
  revalidatePath("/watchlist");
  revalidatePath("/");
}
