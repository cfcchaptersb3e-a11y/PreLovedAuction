import Link from "next/link";
import { EventForm } from "@/components/admin/EventForm";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <span aria-hidden>←</span> Back to auctions
      </Link>
      <div>
        <h2 className="text-lg font-bold">New auction</h2>
        <p className="mt-1 text-sm text-muted">
          This creates a fresh auction with its own goal and its own running total, starting at
          zero. It stays hidden as a draft until you open it for bidding.
        </p>
      </div>
      <div className="card p-5 md:p-6">
        <EventForm />
      </div>
    </div>
  );
}
