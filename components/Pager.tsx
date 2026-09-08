import Link from "next/link";

/**
 * Paging for a long list of items.
 *
 * A chapter with a few hundred donations would otherwise put every card on one
 * page — hundreds of photos to load before the first tap, and a scroll nobody
 * finishes. How many to show is the viewer's choice, because what suits a phone
 * on mobile data is not what suits somebody at a laptop scanning the lot.
 *
 * Everything is links rather than form controls: no JavaScript needed, one tap
 * instead of a change-then-apply, and a page can be shared or reloaded and land
 * exactly where it was.
 */

export const PER_PAGE_OPTIONS = [20, 50, 100] as const;
export const DEFAULT_PER_PAGE = 20;

/** A page size, or "all" for no paging at all. */
export type PerPage = number | "all";

export function perPageFrom(raw: string | undefined): PerPage {
  if (raw === "all") return "all";
  const value = Number(raw);
  return (PER_PAGE_OPTIONS as readonly number[]).includes(value) ? value : DEFAULT_PER_PAGE;
}

export function pageFrom(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 1 ? value : 1;
}

/**
 * Keeps a page number inside the list. A hand-typed or stale `?page=` past the
 * end would otherwise render the "nothing here yet" panel, which tells somebody
 * the auction is empty when it is only the page that is.
 */
export function clampPage(page: number, total: number, per: PerPage): number {
  if (per === "all") return 1;
  return Math.min(page, Math.max(1, Math.ceil(total / per)));
}

/** What to pass Prisma for this page. `take: undefined` means everything. */
export function sliceFor(page: number, per: PerPage): { skip?: number; take?: number } {
  if (per === "all") return {};
  return { skip: (page - 1) * per, take: per };
}

type Params = Record<string, string | undefined>;

function buildHref(basePath: string, params: Params): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** "Show 20 · 50 · 100 · All", sitting above the list so it is set before scrolling. */
export function PerPageLinks({
  per,
  total,
  basePath,
  params = {},
}: {
  per: PerPage;
  total: number;
  basePath: string;
  params?: Params;
}) {
  // Nothing to choose when everything fits in the smallest page anyway.
  if (total <= PER_PAGE_OPTIONS[0]) return null;

  const options: PerPage[] = [...PER_PAGE_OPTIONS, "all"];

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="text-muted">Show</span>
      <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
        {options.map((option) => {
          const active = option === per;
          return (
            <Link
              key={String(option)}
              // Changing the size restarts at the first page: staying on page 5
              // while the pages get bigger lands somewhere nobody asked for.
              href={buildHref(basePath, {
                ...params,
                per: option === DEFAULT_PER_PAGE ? undefined : String(option),
              })}
              aria-current={active ? "true" : undefined}
              className={`rounded-md px-2.5 py-1 font-medium ${
                active ? "bg-forest text-white" : "text-muted hover:bg-parchment hover:text-ink"
              }`}
            >
              {option === "all" ? "All" : option}
            </Link>
          );
        })}
      </div>
      <span className="text-muted">per page</span>
    </div>
  );
}

export function Pager({
  total,
  page,
  per,
  basePath,
  params = {},
}: {
  total: number;
  page: number;
  per: PerPage;
  basePath: string;
  /** The filters in force, so paging keeps them. */
  params?: Params;
}) {
  const carried = { ...params, per: per === DEFAULT_PER_PAGE ? undefined : String(per) };

  if (per === "all") {
    if (total <= PER_PAGE_OPTIONS[0]) return null;
    return (
      <p className="border-t border-line pt-4 text-sm text-muted">
        Showing all <span className="font-medium text-ink">{total}</span> items.
      </p>
    );
  }

  const pages = Math.ceil(total / per);
  if (pages <= 1) return null;

  const href = (target: number) =>
    buildHref(basePath, { ...carried, page: target > 1 ? String(target) : undefined });

  const first = (page - 1) * per + 1;
  const last = Math.min(page * per, total);

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
