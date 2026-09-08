import Link from "next/link";

/**
 * Pages through a long list of items.
 *
 * A chapter with a few hundred donations would otherwise put every card on one
 * page — hundreds of photos to load before the first tap, and a scroll nobody
 * finishes. Links rather than a button, so a page can be shared or reloaded and
 * lands in the same place.
 */
export const PER_PAGE = 48;

export function pageFrom(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 1 ? value : 1;
}

/**
 * Keeps a page number inside the list. A hand-typed or stale `?page=` past the
 * end would otherwise render the "nothing here yet" panel, which tells somebody
 * the auction is empty when it is only the page that is.
 */
export function clampPage(page: number, total: number): number {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  return Math.min(page, pages);
}

export function Pager({
  total,
  page,
  basePath,
  params = {},
}: {
  total: number;
  page: number;
  basePath: string;
  /** The filters in force, so paging keeps them. */
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.ceil(total / PER_PAGE);
  if (pages <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const first = (page - 1) * PER_PAGE + 1;
  const last = Math.min(page * PER_PAGE, total);

  return (
    <nav
      aria-label="Pages of items"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
    >
      <p className="text-sm text-muted">
        Showing <span className="font-medium text-ink">{first}–{last}</span> of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="btn-secondary btn-sm">
            ← Previous
          </Link>
        ) : (
          <span className="btn-secondary btn-sm opacity-40" aria-disabled>
            ← Previous
          </span>
        )}
        <span className="text-sm text-muted">
          Page {page} of {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} className="btn-secondary btn-sm">
            Next →
          </Link>
        ) : (
          <span className="btn-secondary btn-sm opacity-40" aria-disabled>
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}
