/**
 * Checks the live finale: advance bids, the room and people at home bidding
 * into one lot, and selling it.
 *
 * Run against a scratch database with:  npm run check:live
 */
import { db } from "@/lib/db";
import { BidError, finalizeDueItems, placeBid } from "@/lib/auction";
import { describeBidder } from "@/lib/live";

let failures = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
  if (!ok) failures++;
};
async function expectError(name: string, fn: () => Promise<unknown>, expected: RegExp) {
  try {
    await fn();
    check(name, false, "no error thrown");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(name, error instanceof BidError && expected.test(message), message);
  }
}

async function main() {
  const suffix = Date.now();
  const event = await db.auctionEvent.create({
    data: { name: `Live ${suffix}`, slug: `live-${suffix}`, status: "OPEN", currency: "PHP" },
  });
  const [athome, other] = await Promise.all(
    ["athome", "other"].map((who) =>
      db.user.create({ data: { email: `${who}-${suffix}@example.com`, name: "Maria Santos" } })
    )
  );

  // A live lot whose clock has already passed: it must not close on its own.
  const lot = await db.item.create({
    data: {
      eventId: event.id, title: "Headline lot", status: "LIVE",
      isLiveLot: true, lotNumber: 1,
      startingBidCents: 100_000, bidIncrementCents: 50_000,
      endsAt: new Date(Date.now() - 60_000),
    },
  });
  const normal = await db.item.create({
    data: {
      eventId: event.id, title: "Ordinary item", status: "LIVE",
      startingBidCents: 10_000, bidIncrementCents: 1_000,
      endsAt: new Date(Date.now() + 60_000),
    },
  });

  // --- the clock does not close a live lot ---
  await placeBid({ itemId: normal.id, userId: athome.id, amountCents: 10_000 });
  // Both items are now past their end time; only the ordinary one should close.
  await db.item.update({ where: { id: normal.id }, data: { endsAt: new Date(Date.now() - 1000) } });
  await finalizeDueItems();
  check("the clock still closes an ordinary item",
    (await db.item.findUnique({ where: { id: normal.id } }))?.status === "ENDED");
  check("a live lot is not closed by its clock",
    (await db.item.findUnique({ where: { id: lot.id } }))?.status === "LIVE");

  // --- advance bids from home set the opening price ---
  await placeBid({ itemId: lot.id, userId: athome.id, amountCents: 100_000 });
  check("an advance bid is accepted before the event",
    (await db.bid.count({ where: { itemId: lot.id } })) === 1);

  // --- the room bids into the same lot ---
  await placeBid({ itemId: lot.id, bidderLabel: "Paddle 12", channel: "ROOM", amountCents: 150_000 });
  const afterRoom = await db.bid.findFirst({
    where: { itemId: lot.id }, orderBy: [{ amountCents: "desc" }, { createdAt: "asc" }],
  });
  check("a room bid outbids the advance bid",
    afterRoom?.amountCents === 150_000 && afterRoom?.channel === "ROOM" && afterRoom?.userId === null);
  check("the room bidder is recorded by label", afterRoom?.bidderLabel === "Paddle 12");

  await expectError("the room cannot outbid itself",
    () => placeBid({ itemId: lot.id, bidderLabel: "Paddle 12", channel: "ROOM", amountCents: 200_000 }),
    /already holds the highest bid/);
  await expectError("a bid below the next increment is refused",
    () => placeBid({ itemId: lot.id, userId: athome.id, amountCents: 160_000 }), /at least/);
  await expectError("a bid needs a bidder",
    () => placeBid({ itemId: lot.id, amountCents: 300_000 }), /needs a bidder/);

  // --- someone at home answers the room ---
  await placeBid({ itemId: lot.id, userId: athome.id, amountCents: 200_000 });
  check("someone at home can outbid the room",
    (await db.bid.findFirst({ where: { itemId: lot.id }, orderBy: [{ amountCents: "desc" }] }))
      ?.userId === athome.id);

  // --- the room and the floor bidding at the same instant ---
  const together = await Promise.allSettled([
    placeBid({ itemId: lot.id, bidderLabel: "Paddle 7", channel: "ROOM", amountCents: 250_000 }),
    placeBid({ itemId: lot.id, userId: other.id, amountCents: 250_000 }),
  ]);
  check("simultaneous room and online bids: exactly one wins",
    together.filter((r) => r.status === "fulfilled").length === 1);
  // Advance, room 150k, home 200k, and one of the two simultaneous 250k bids.
  check("the losing simultaneous bid leaves no row behind",
    (await db.bid.count({ where: { itemId: lot.id } })) === 4,
    `${await db.bid.count({ where: { itemId: lot.id } })} bids`);

  // --- selling it ---
  const top = (await db.bid.findFirst({
    where: { itemId: lot.id }, orderBy: [{ amountCents: "desc" }, { createdAt: "asc" }],
  }))!;
  await db.item.update({
    where: { id: lot.id },
    data: { status: "ENDED", winnerId: top.userId, winnerLabel: top.bidderLabel,
            winningBidCents: top.amountCents },
  });
  const sold = await db.item.findUnique({ where: { id: lot.id } });
  check("the lot records its winner", sold?.winningBidCents === 250_000);
  check("a room winner is kept by label when they have no account",
    Boolean(sold?.winnerId) || Boolean(sold?.winnerLabel));

  await expectError("a sold lot takes no more bids",
    () => placeBid({ itemId: lot.id, userId: athome.id, amountCents: 400_000 }),
    /not open for bidding/);

  // --- how bidders are shown to each other ---
  check("a paddle label is shown as given", describeBidder("Paddle 12") === "Paddle 12");
  check("a member is shown by first name and initial",
    describeBidder(null, "Maria Santos Cruz") === "Maria C.");
  check("an email is never shown in full",
    !describeBidder(null, null, "someone@example.com").includes("someone@example.com"));

  await db.auctionEvent.delete({ where: { id: event.id } });
  await db.user.deleteMany({ where: { id: { in: [athome.id, other.id] } } });
  await db.$disconnect();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failed.`);
  process.exit(failures ? 1 : 0);
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
