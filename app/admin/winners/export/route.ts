import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Escapes a value for CSV, guarding against spreadsheet formula injection. */
function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Organisers only." }, { status: 403 });
  }

  const eventId = new URL(request.url).searchParams.get("event");
  if (!eventId) return NextResponse.json({ error: "Missing auction." }, { status: 400 });

  const event = await db.auctionEvent.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Auction not found." }, { status: 404 });

  const wins = await db.item.findMany({
    where: { eventId, winnerId: { not: null } },
    include: { winner: true },
    orderBy: { title: "asc" },
  });

  const header = [
    "Item",
    "Donated by",
    "Winner name",
    "Winner email",
    "Winner phone",
    `Winning bid (${event.currency})`,
    "Payment",
    "Handover",
    "Closed at",
  ];

  const rows = wins.map((item) => [
    csvCell(item.title),
    csvCell(item.donorName),
    csvCell(item.winner?.name),
    csvCell(item.winner?.email),
    csvCell(item.winner?.phone),
    csvCell(((item.winningBidCents ?? 0) / 100).toFixed(2)),
    csvCell(item.paymentStatus === "PAID" ? "Paid" : "Unpaid"),
    csvCell(item.handoverStatus === "COLLECTED" ? "Collected" : "Pending"),
    csvCell(item.endsAt.toISOString()),
  ]);

  const totalRow = [
    csvCell("TOTAL"),
    "",
    "",
    "",
    "",
    csvCell((wins.reduce((sum, item) => sum + (item.winningBidCents ?? 0), 0) / 100).toFixed(2)),
    "",
    "",
    "",
  ];

  // The BOM keeps Excel happy with UTF-8 names and currency symbols.
  const csv = `﻿${[header.map(csvCell), ...rows, totalRow].map((row) => row.join(",")).join("\r\n")}`;
  const filename = `${event.slug}-winners.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
