import { NextResponse } from "next/server";
import { finalizeDueItems } from "@/lib/auction";

export const dynamic = "force-dynamic";

/**
 * Closes finished items and emails their winners. Wired to Vercel Cron in
 * vercel.json; pages also finalise lazily, so a missed run is not a problem.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const provided = request.headers.get("authorization");
    if (provided !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const closed = await finalizeDueItems();
  return NextResponse.json({ ok: true, closed });
}
