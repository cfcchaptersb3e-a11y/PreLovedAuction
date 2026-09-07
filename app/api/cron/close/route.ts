import { NextResponse } from "next/server";
import { finalizeDueItems } from "@/lib/auction";

export const dynamic = "force-dynamic";

/**
 * Closes finished items and emails their winners. Wired to Vercel Cron in
 * vercel.json; pages also finalize lazily, so a missed run is not a problem.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;

  // Fails closed. Treating an unset secret as "no authentication needed" left
  // this open to anyone who guessed the path — harmless in what it does, but a
  // deployed endpoint should not decide it needs no key because none was given.
  // Development still runs it unguarded so the job can be tried locally.
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.error("CRON_SECRET is not set, so the nightly closing job cannot run.");
      return NextResponse.json(
        { error: "CRON_SECRET is not set on this deployment." },
        { status: 503 }
      );
    }
  } else if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const closed = await finalizeDueItems();
  return NextResponse.json({ ok: true, closed });
}
