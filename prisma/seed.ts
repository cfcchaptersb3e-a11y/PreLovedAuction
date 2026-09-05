/**
 * Seeds a demo auction so the app can be clicked through immediately.
 * Run with: npm run seed
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const HOURS = 60 * 60 * 1000;

const ITEMS = [
  {
    title: "Vintage leather handbag",
    description:
      "Genuine leather, warm tan color, with a detachable strap. Gently used and well cared for — some softening at the corners, which honestly makes it look better.",
    category: "Bags",
    condition: "Very good",
    donorName: "The Cruz family",
    startingBidCents: 50_000,
    bidIncrementCents: 5_000,
    endsInHours: 48,
  },
  {
    title: "Acoustic guitar with soft case",
    description:
      "Full-size dreadnought, recently restrung. Lovely warm tone. Comes with a padded soft case and a capo.",
    category: "Music",
    condition: "Good",
    donorName: "Ka Ben & Ka Lisa",
    startingBidCents: 250_000,
    bidIncrementCents: 25_000,
    reserveCents: 350_000,
    endsInHours: 72,
  },
  {
    title: "Cast iron dutch oven, 5 quart",
    description:
      "Enamelled cast iron in cream. Seasoned and ready for adobo, kaldereta or a Sunday roast. Small chip on the outside rim, does not affect cooking.",
    category: "Kitchen",
    condition: "Good",
    donorName: "The Santos household",
    startingBidCents: 80_000,
    bidIncrementCents: 10_000,
    endsInHours: 24,
  },
  {
    title: "Children's book bundle (24 titles)",
    description:
      "A mix of picture books and early readers, all in reading condition. Great for a young family or a household library.",
    category: "Books",
    condition: "Good",
    donorName: "Tita Marissa",
    startingBidCents: 30_000,
    bidIncrementCents: 5_000,
    endsInHours: 36,
  },
  {
    title: "Rattan accent chair",
    description:
      "Handwoven rattan with a solid wood frame. Sturdy, no wobble. Cushion not included. Pickup only, please bring a car.",
    category: "Furniture",
    condition: "Very good",
    donorName: "The Reyes family",
    startingBidCents: 150_000,
    bidIncrementCents: 20_000,
    endsInHours: 60,
  },
  {
    title: "Barely-used espresso machine",
    description:
      "Bought with great enthusiasm, used about ten times, then the family switched to instant. Descaled and cleaned. Includes portafilter and tamper.",
    category: "Kitchen",
    condition: "Like new",
    donorName: "Ka Dennis",
    startingBidCents: 300_000,
    bidIncrementCents: 25_000,
    endsInHours: 6,
  },
];

async function main() {
  const slug = "demo-auction";
  await db.auctionEvent.deleteMany({ where: { slug } });

  const event = await db.auctionEvent.create({
    data: {
      name: "CFC SB3E Pre-Loved Auction (Demo)",
      slug,
      tagline: "Pre-loved treasures from our members, raising funds for the chapter",
      description:
        "Every item here was provided by a chapter family. Proceeds go towards our chapter's outreach and formation activities. Bid generously!",
      currency: "PHP",
      goalCents: 5_000_00,
      status: "OPEN",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 72 * HOURS),
      paymentInstructions:
        "GCash: 0917 123 4567 (Maria S.)\nBank transfer: BPI 1234-5678-90, CFC SB3E Chapter\n\nPlease send a screenshot of your payment to the chapter group chat.",
      pickupInstructions:
        "Items can be collected after the Sunday household meeting, or we can arrange delivery within the area.",
    },
  });

  for (const item of ITEMS) {
    const { endsInHours, ...data } = item;
    await db.item.create({
      data: {
        ...data,
        eventId: event.id,
        status: "LIVE",
        endsAt: new Date(Date.now() + endsInHours * HOURS),
      },
    });
  }

  console.log(`Seeded "${event.name}" with ${ITEMS.length} items.`);
  console.log("Sign in at /login with the email in ADMIN_EMAILS to manage it.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
