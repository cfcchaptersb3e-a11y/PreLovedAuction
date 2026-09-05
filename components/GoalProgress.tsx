import { formatMoney } from "@/lib/money";
import type { EventTotals } from "@/lib/auction";

export function GoalProgress({
  totals,
  currency,
  compact = false,
}: {
  totals: EventTotals;
  currency: string;
  compact?: boolean;
}) {
  const hasGoal = totals.goalCents > 0;

  return (
    <div className={compact ? "" : "card p-5 md:p-6"}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Raised so far
          </p>
          <p className="text-3xl font-bold text-forest md:text-4xl">
            {formatMoney(totals.raisedCents, currency)}
          </p>
        </div>
        {hasGoal && (
          <p className="text-sm text-muted">
            of <span className="font-semibold text-ink">{formatMoney(totals.goalCents, currency)}</span> goal
            <span className="ml-2 chip bg-forest-light text-forest">{totals.percent}%</span>
          </p>
        )}
      </div>

      {hasGoal && (
        <div
          className="mt-4 h-3 w-full overflow-hidden rounded-full bg-parchment"
          role="progressbar"
          aria-valuenow={totals.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Fundraising progress"
        >
          <div
            className="h-full rounded-full bg-forest transition-all duration-700"
            style={{ width: `${Math.max(totals.percent, totals.raisedCents > 0 ? 2 : 0)}%` }}
          />
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">Items sold</dt>
          <dd className="font-semibold">
            {totals.itemsSold} <span className="font-normal text-muted">/ {totals.itemsTotal}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Bids placed</dt>
          <dd className="font-semibold">{totals.bidCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Bidders</dt>
          <dd className="font-semibold">{totals.bidderCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Collected</dt>
          <dd className="font-semibold">{formatMoney(totals.collectedCents, currency)}</dd>
        </div>
      </dl>
    </div>
  );
}
