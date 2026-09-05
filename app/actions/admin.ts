"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";
import { finalizeDueItems, slugify } from "@/lib/auction";
import { parseMoneyToCents } from "@/lib/money";
import type { EventStatus, ItemStatus, Role } from "@prisma/client";
import { ASSIGNABLE_ROLES } from "@/lib/permissions";

export type AdminFormState = { error?: string; message?: string };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Ensures the slug is unique, appending -2, -3 … as needed. */
async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  for (let suffix = 0; suffix < 50; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const clash = await db.auctionEvent.findUnique({ where: { slug: candidate } });
    if (!clash || clash.id === excludeId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

// ---------------------------------------------------------------- events

export async function createEvent(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireCapability("events");

  const name = text(formData, "name");
  if (!name) return { error: "Give the auction a name, e.g. “Christmas 2026 Pre-Loved Auction”." };

  const goalCents = parseMoneyToCents(text(formData, "goal")) ?? 0;
  if (goalCents < 0) return { error: "The fundraising goal can't be negative." };

  const event = await db.auctionEvent.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      tagline: optionalText(formData, "tagline"),
      description: optionalText(formData, "description"),
      currency: text(formData, "currency") || "PHP",
      goalCents,
      paymentInstructions: optionalText(formData, "paymentInstructions"),
      pickupInstructions: optionalText(formData, "pickupInstructions"),
      startsAt: parseDate(text(formData, "startsAt")),
      endsAt: parseDate(text(formData, "endsAt")),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/events");
  redirect(`/admin/events/${event.id}`);
}

export async function updateEvent(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireCapability("events");

  const id = text(formData, "eventId");
  const name = text(formData, "name");
  if (!id) return { error: "Missing auction id." };
  if (!name) return { error: "The auction needs a name." };

  const goalCents = parseMoneyToCents(text(formData, "goal")) ?? 0;
  if (goalCents < 0) return { error: "The fundraising goal can't be negative." };

  await db.auctionEvent.update({
    where: { id },
    data: {
      name,
      slug: await uniqueSlug(name, id),
      tagline: optionalText(formData, "tagline"),
      description: optionalText(formData, "description"),
      currency: text(formData, "currency") || "PHP",
      goalCents,
      paymentInstructions: optionalText(formData, "paymentInstructions"),
      pickupInstructions: optionalText(formData, "pickupInstructions"),
      startsAt: parseDate(text(formData, "startsAt")),
      endsAt: parseDate(text(formData, "endsAt")),
    },
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/admin/events/${id}`);
  return { message: "Auction details saved." };
}

/**
 * Moves an auction between draft, open and closed. Opening an auction also
 * puts its draft items live; closing it settles every item that is still
 * running so winners are recorded immediately.
 */
export async function setEventStatus(eventId: string, status: EventStatus): Promise<void> {
  await requireCapability("events");

  if (status === "OPEN") {
    // Only one auction is promoted at a time, so close any other open one.
    await db.auctionEvent.updateMany({
      where: { status: "OPEN", id: { not: eventId } },
      data: { status: "CLOSED" },
    });
    await db.item.updateMany({
      where: { eventId, status: "DRAFT" },
      data: { status: "LIVE" },
    });
  }

  if (status === "CLOSED") {
    // End any still-running items now, then award them.
    await db.item.updateMany({
      where: { eventId, status: "LIVE", endsAt: { gt: new Date() } },
      data: { endsAt: new Date() },
    });
  }

  await db.auctionEvent.update({ where: { id: eventId }, data: { status } });

  if (status === "CLOSED") await finalizeDueItems();

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteEvent(eventId: string): Promise<void> {
  await requireCapability("events");
  const bidCount = await db.bid.count({ where: { item: { eventId } } });
  if (bidCount > 0) {
    throw new Error(
      "This auction already has bids, so it can't be deleted. Close it instead — it stays in the past-auctions archive."
    );
  }
  await db.auctionEvent.delete({ where: { id: eventId } });
  revalidatePath("/admin");
  revalidatePath("/events");
}

// ----------------------------------------------------------------- items

function parseImageUrls(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => /^(https?:\/\/|\/api\/uploads\/)/.test(entry))
    .slice(0, 8);
}

/** The editable fields of an item, shared by the create and update forms. */
type ItemFields = {
  title: string;
  description: string | null;
  category: string | null;
  condition: string | null;
  donorName: string | null;
  imageUrls: string[];
  startingBidCents: number;
  bidIncrementCents: number;
  reserveCents: number | null;
  endsAt: Date;
};

function itemDataFromForm(
  formData: FormData,
  eventEndsAt: Date | null
): { error?: string; data?: ItemFields } {
  const title = text(formData, "title");
  if (!title) return { error: "Every item needs a title." };

  const startingBidCents = parseMoneyToCents(text(formData, "startingBid")) ?? 0;
  const bidIncrementCents = parseMoneyToCents(text(formData, "bidIncrement")) ?? 5000;
  const reserveRaw = text(formData, "reserve");
  const reserveCents = reserveRaw ? parseMoneyToCents(reserveRaw) : null;

  if (startingBidCents < 0) return { error: "The starting bid can't be negative." };
  if (bidIncrementCents <= 0) return { error: "The bid increment must be more than zero." };
  if (reserveCents !== null && reserveCents < startingBidCents) {
    return { error: "The reserve price can't be lower than the starting bid." };
  }

  const endsAt = parseDate(text(formData, "endsAt")) ?? eventEndsAt;
  if (!endsAt) {
    return { error: "Set a closing time for this item, or set one on the auction itself." };
  }

  return {
    data: {
      title,
      description: optionalText(formData, "description"),
      category: optionalText(formData, "category"),
      condition: optionalText(formData, "condition"),
      donorName: optionalText(formData, "donorName"),
      imageUrls: parseImageUrls(text(formData, "imageUrls")),
      startingBidCents,
      bidIncrementCents,
      reserveCents,
      endsAt,
    },
  };
}

export async function createItem(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireCapability("items");

  const eventId = text(formData, "eventId");
  const event = await db.auctionEvent.findUnique({ where: { id: eventId } });
  if (!event) return { error: "That auction no longer exists." };

  const parsed = itemDataFromForm(formData, event.endsAt);
  if (parsed.error || !parsed.data) return { error: parsed.error };

  await db.item.create({
    data: {
      ...parsed.data,
      eventId,
      // Items added to an auction that is already running go live immediately.
      status: event.status === "OPEN" ? "LIVE" : "DRAFT",
    },
  });

  revalidatePath("/");
  revalidatePath(`/admin/events/${eventId}`);
  return { message: `“${parsed.data.title}” added.` };
}

export async function updateItem(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireCapability("items");

  const itemId = text(formData, "itemId");
  const item = await db.item.findUnique({ where: { id: itemId }, include: { event: true } });
  if (!item) return { error: "That item no longer exists." };

  const parsed = itemDataFromForm(formData, item.event.endsAt);
  if (parsed.error || !parsed.data) return { error: parsed.error };

  const bidCount = await db.bid.count({ where: { itemId } });
  if (bidCount > 0 && parsed.data.startingBidCents !== item.startingBidCents) {
    return { error: "This item already has bids, so the starting bid can no longer be changed." };
  }

  await db.item.update({ where: { id: itemId }, data: parsed.data });

  revalidatePath("/");
  revalidatePath(`/items/${itemId}`);
  revalidatePath(`/admin/events/${item.eventId}`);
  return { message: "Item saved." };
}

export async function setItemStatus(itemId: string, status: ItemStatus): Promise<void> {
  // Withdrawing pulls an item out from under people who have already bid on
  // it, so it stays with organizers even though other item changes do not.
  await requireCapability(status === "CANCELLED" ? "events" : "items");
  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) return;

  if (status === "ENDED") {
    await db.item.update({ where: { id: itemId }, data: { endsAt: new Date() } });
    await finalizeDueItems();
  } else {
    await db.item.update({
      where: { id: itemId },
      data: { status, ...(status === "CANCELLED" ? { winnerId: null, winningBidCents: null } : {}) },
    });
  }

  revalidatePath("/");
  revalidatePath(`/items/${itemId}`);
  revalidatePath(`/admin/events/${item.eventId}`);
}

export async function deleteItem(itemId: string): Promise<void> {
  await requireCapability("items");
  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) return;

  const bidCount = await db.bid.count({ where: { itemId } });
  if (bidCount > 0) {
    throw new Error(
      "This item already has bids, so it can't be deleted. Cancel it instead to keep the bid history."
    );
  }

  await db.item.delete({ where: { id: itemId } });
  revalidatePath("/");
  revalidatePath(`/admin/events/${item.eventId}`);
}

// --------------------------------------------------------------- winners

export async function setPaymentStatus(itemId: string, paid: boolean): Promise<void> {
  await requireCapability("payments");
  await db.item.update({
    where: { id: itemId },
    data: { paymentStatus: paid ? "PAID" : "UNPAID" },
  });
  revalidatePath("/admin/winners");
  revalidatePath("/account");
  revalidatePath("/");
}

export async function setHandoverStatus(itemId: string, collected: boolean): Promise<void> {
  await requireCapability("payments");
  await db.item.update({
    where: { id: itemId },
    data: { handoverStatus: collected ? "COLLECTED" : "PENDING" },
  });
  revalidatePath("/admin/winners");
  revalidatePath("/account");
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  const actor = await requireCapability("people");

  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error("That isn't a role we recognize.");
  }
  if (actor.id === userId && role !== "ADMIN") {
    throw new Error(
      "You can't remove your own organizer access — ask another organizer to do it."
    );
  }

  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/people");
}
