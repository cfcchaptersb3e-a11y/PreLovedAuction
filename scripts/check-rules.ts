/**
 * Checks the auction rules against a real database: bid validation, simultaneous
 * bids, anti-sniping, reserve prices, closing, and per-event totals.
 *
 * Run against a scratch database with:  npm run check
 * It creates its own test auction and users, and deletes them afterwards.
 */
import { db } from "@/lib/db";
import { BidError, finalizeDueItems, getEventTotals, placeBid, minimumBidCents } from "@/lib/auction";

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures++;
}
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
    data: {
      name: `Test Auction ${suffix}`,
      slug: `test-${suffix}`,
      currency: "PHP",
      goalCents: 100_000,
      status: "OPEN",
    },
  });

  const [alice, bob, carol] = await Promise.all(
    ["alice", "bob", "carol"].map((who) =>
      db.user.create({ data: { email: `${who}-${suffix}@example.com`, name: `${who} Tester` } })
    )
  );

  const item = await db.item.create({
    data: {
      eventId: event.id,
      title: "Test lamp",
      startingBidCents: 10_000,
      bidIncrementCents: 2_500,
      status: "LIVE",
      endsAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // --- bid validation -----------------------------------------------------
  check("minimum bid with no bids = starting bid", minimumBidCents(item, null) === 10_000);
  await expectError("bid below starting bid rejected", () =>
    placeBid({ itemId: item.id, userId: alice.id, amountCents: 9_900 }), /at least/);

  await placeBid({ itemId: item.id, userId: alice.id, amountCents: 10_000 });
  check("first bid at starting price accepted", true);

  await expectError("bidding against yourself rejected", () =>
    placeBid({ itemId: item.id, userId: alice.id, amountCents: 20_000 }), /already the highest/);

  await expectError("bid below increment rejected", () =>
    placeBid({ itemId: item.id, userId: bob.id, amountCents: 11_000 }), /at least/);

  await placeBid({ itemId: item.id, userId: bob.id, amountCents: 12_500 });
  check("bid at exactly increment accepted", true);

  // --- concurrent bids ----------------------------------------------------
  const concurrent = await Promise.allSettled([
    placeBid({ itemId: item.id, userId: alice.id, amountCents: 15_000 }),
    placeBid({ itemId: item.id, userId: carol.id, amountCents: 15_000 }),
  ]);
  const accepted = concurrent.filter((r) => r.status === "fulfilled").length;
  check("two simultaneous equal bids: exactly one wins", accepted === 1,
    `${accepted} accepted`);

  const bidsSoFar = await db.bid.count({ where: { itemId: item.id } });
  check("no phantom bid rows from the race", bidsSoFar === 3, `${bidsSoFar} bids`);

  // --- anti-sniping -------------------------------------------------------
  const sniped = await db.item.create({
    data: {
      eventId: event.id,
      title: "Snipe target",
      startingBidCents: 5_000,
      bidIncrementCents: 1_000,
      status: "LIVE",
      endsAt: new Date(Date.now() + 30 * 1000), // 30s left
    },
  });
  const result = await placeBid({ itemId: sniped.id, userId: bob.id, amountCents: 5_000 });
  check("late bid extends the clock", result.extended);
  check("clock extended by ~2 minutes",
    result.newEndsAt.getTime() - Date.now() > 110 * 1000);

  // --- reserve price ------------------------------------------------------
  const reserved = await db.item.create({
    data: {
      eventId: event.id,
      title: "Reserved piece",
      startingBidCents: 10_000,
      bidIncrementCents: 1_000,
      reserveCents: 50_000,
      status: "LIVE",
      endsAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  await placeBid({ itemId: reserved.id, userId: alice.id, amountCents: 20_000 });
  await db.item.update({ where: { id: reserved.id }, data: { endsAt: new Date(Date.now() - 1000) } });

  // --- closing ------------------------------------------------------------
  await db.item.update({ where: { id: item.id }, data: { endsAt: new Date(Date.now() - 1000) } });
  const closed = await finalizeDueItems();
  check("finalize closed the due items", closed === 2, `${closed} closed`);

  const settled = await db.item.findUnique({ where: { id: item.id } });
  check("winner recorded", settled?.winnerId !== null && settled?.status === "ENDED");
  check("winning amount is the top bid", settled?.winningBidCents === 15_000,
    String(settled?.winningBidCents));

  const unsold = await db.item.findUnique({ where: { id: reserved.id } });
  check("reserve not met: no winner", unsold?.status === "ENDED" && unsold?.winnerId === null);

  const again = await finalizeDueItems();
  check("finalize is idempotent", again === 0, `${again} closed on second run`);

  await expectError("cannot bid on a closed item", () =>
    placeBid({ itemId: item.id, userId: carol.id, amountCents: 99_999 }), /not open|closed/);

  // --- totals -------------------------------------------------------------
  const totals = await getEventTotals(event.id);
  check("raised counts only won items", totals.raisedCents === 15_000, String(totals.raisedCents));
  check("collected is zero until marked paid", totals.collectedCents === 0);
  check("goal percentage computed", totals.percent === 15, String(totals.percent));

  await db.item.update({ where: { id: item.id }, data: { paymentStatus: "PAID" } });
  const afterPaid = await getEventTotals(event.id);
  check("collected reflects payments", afterPaid.collectedCents === 15_000);

  // --- a second event starts from zero ------------------------------------
  const nextEvent = await db.auctionEvent.create({
    data: { name: `Next ${suffix}`, slug: `next-${suffix}`, goalCents: 200_000, status: "DRAFT" },
  });
  const nextTotals = await getEventTotals(nextEvent.id);
  check("a new auction's total starts at zero",
    nextTotals.raisedCents === 0 && nextTotals.percent === 0);

  // cleanup
  await db.auctionEvent.deleteMany({ where: { id: { in: [event.id, nextEvent.id] } } });
  await db.user.deleteMany({ where: { id: { in: [alice.id, bob.id, carol.id] } } });

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
