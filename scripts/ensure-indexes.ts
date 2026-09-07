/**
 * Creates the indexes that Prisma's schema deliberately does not declare.
 *
 * `prisma db push` refuses to add a unique constraint without
 * --accept-data-loss, because it cannot know whether existing rows would
 * collide. Putting that flag in the deploy would silence the same warning for
 * every future change, including the destructive ones it exists to catch — so
 * the one index we need is created here instead, right after the push.
 *
 * Everything below must be safe to run on every deploy.
 */
import { db } from "@/lib/db";

async function main() {
  // A mobile number signs someone in, so two accounts must never share one.
  // Partial, because NULL means "this person signed up with an email address"
  // and any number of accounts may be in that position.
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "User_mobile_unique"
    ON "User" ("mobile")
    WHERE "mobile" IS NOT NULL
  `);

  console.log("Indexes are in place.");
}

main()
  .catch((error) => {
    console.error("Could not create an index:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
