/**
 * Sample data for the handout screenshots.
 *
 * Not a fixture for the checks — those make their own. This exists so the
 * pictures in the handouts look like a real chapter drive: items with names
 * somebody actually donated, a few bids already placed, one lot held back for
 * the live finale, and helpers who hold each role.
 *
 * Run against a scratch database:  npm run handouts:seed
 */
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const ONLINE = [
  { title: "Vintage leather handbag", category: "Bags", donor: "The Cruz family", start: 80000, condition: "Very good" },
  { title: "Rattan rocking chair", category: "Furniture", donor: "The Reyes family", start: 150000, condition: "Good" },
  { title: "Rice cooker, 1.8L", category: "Kitchen", donor: "The Lim family", start: 45000, condition: "Like new" },
  { title: "Children's book bundle", category: "Books", donor: "The Delos Reyes family", start: 30000, condition: "Good" },
  { title: "Ceramic dinner set for six", category: "Kitchen", donor: "The Aquino family", start: 120000, condition: "Very good" },
  { title: "Wooden chess set", category: "Games", donor: "The Bautista family", start: 60000, condition: "Excellent" },
  { title: "Electric stand fan", category: "Home", donor: "The Mendoza family", start: 90000, condition: "Good" },
  { title: "Framed capiz mirror", category: "Home", donor: "The Villanueva family", start: 110000, condition: "Excellent" },
];

const LIVE_LOTS = [
  { title: "Antique narra dining table", donor: "The Ocampo family", start: 500000, lot: 1 },
  { title: "Signed jersey, framed", donor: "The Torres family", start: 300000, lot: 2 },
];

async function main() {
  await db.bid.deleteMany({}); await db.watch.deleteMany({}); await db.item.deleteMany({});
  await db.auctionEvent.deleteMany({}); await db.passwordResetRequest.deleteMany({});
  await db.loginToken.deleteMany({}); await db.user.deleteMany({});

  const password = await hashPassword("chapter2026");
  const person = (email: string, name: string, role: "BIDDER" | "CATALOGUER" | "TREASURER" | "ADMIN") =>
    db.user.create({ data: { email, name, role, passwordHash: password } });

  const [organizer, cataloger, treasurer, ana, ben, carmen] = await Promise.all([
    person("organizer@example.com", "Rina Delos Reyes", "ADMIN"),
    person("cataloger@example.com", "Marco Lim", "CATALOGUER"),
    person("treasurer@example.com", "Tess Bautista", "TREASURER"),
    person("ana@example.com", "Ana Santos", "BIDDER"),
    person("ben@example.com", "Ben Cruz", "BIDDER"),
    person("carmen@example.com", "Carmen Reyes", "BIDDER"),
  ]);

  const event = await db.auctionEvent.create({ data: {
    name: "Chapter Pre-Loved Auction", slug: "chapter-pre-loved-auction",
    tagline: "Pre-loved treasures from our members",
    goalCents: 5000000, currency: "PHP", status: "OPEN",
    endsAt: new Date(Date.now() + 5 * 864e5),
    paymentInstructions: "GCash 0917 123 4567 (Maria S.)\nOr hand it to any organizer after the Sunday meeting.",
    pickupInstructions: "Collect after the Sunday household meeting, or we can deliver within the area.",
  }});

  const bidders = [ana, ben, carmen];
  for (const [i, spec] of ONLINE.entries()) {
    const item = await db.item.create({ data: {
      eventId: event.id, title: spec.title, category: spec.category,
      donorName: spec.donor, condition: spec.condition,
      description: "A well-cared-for piece from a chapter household. Collected after the Sunday meeting.",
      startingBidCents: spec.start, bidIncrementCents: 5000,
      reserveCents: i === 1 ? spec.start + 50000 : null,
      endsAt: new Date(Date.now() + (2 + (i % 4)) * 864e5), status: "LIVE",
    }});
    if (i % 3 === 0) {
      for (const [b, bidder] of bidders.slice(0, 2).entries()) {
        await db.bid.create({ data: {
          itemId: item.id, userId: bidder.id, amountCents: spec.start + b * 10000,
        }});
      }
    }
  }

  // Two lots held back for the finale, so the live pages have something to show.
  for (const lot of LIVE_LOTS) {
    await db.item.create({ data: {
      eventId: event.id, title: lot.title, donorName: lot.donor,
      description: "Held back for the live auction on the night.",
      startingBidCents: lot.start, bidIncrementCents: 25000,
      endsAt: new Date(Date.now() + 5 * 864e5),
      status: "LIVE", isLiveLot: true, lotNumber: lot.lot,
    }});
  }

  // Several items already sold, and one already paid for. A winners list with a
  // single row makes the treasurer's handout show the same picture twice, and
  // is not what the page looks like by the end of a real drive either.
  const SOLD = [
    { title: "Hand-embroidered table runner", donor: "The Santos family", winner: ana, price: 65000, paid: true },
    { title: "Cast iron frying pan", donor: "The Cruz family", winner: ben, price: 85000, paid: false },
    { title: "Boxed jigsaw, 1000 pieces", donor: "The Lim family", winner: carmen, price: 35000, paid: false },
  ];
  for (const spec of SOLD) {
    const sold = await db.item.create({ data: {
      eventId: event.id, title: spec.title, donorName: spec.donor, category: "Home",
      startingBidCents: Math.round(spec.price * 0.6), bidIncrementCents: 5000,
      endsAt: new Date(Date.now() - 864e5), status: "ENDED",
      winnerId: spec.winner.id, winningBidCents: spec.price,
      paymentStatus: spec.paid ? "PAID" : "UNPAID",
    }});
    await db.bid.create({ data: { itemId: sold.id, userId: ben.id, amountCents: spec.price - 5000 } });
    await db.bid.create({ data: { itemId: sold.id, userId: spec.winner.id, amountCents: spec.price } });
  }

  console.log(
    `Seeded "${event.name}": ${await db.item.count()} items, ` +
    `${await db.bid.count()} bids, ${await db.user.count()} people.`
  );
  console.log("Sign in as organizer@example.com / cataloger@example.com / treasurer@example.com — password chapter2026");
  await db.$disconnect();
}

main();
