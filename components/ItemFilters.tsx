import Link from "next/link";
import { ITEM_SORTS, ITEM_STATUS_FILTERS, type ItemSortKey, type ItemStatusFilter } from "@/lib/item-filters";

/**
 * The search / category / sort row above an item list.
 *
 * A plain GET form: it works without JavaScript, and every choice ends up in
 * the URL so a filtered list can be shared or reloaded. Submitting drops any
 * `page` — a new filter should start at the first page, not at whatever page
 * number happened to be showing.
 */
export function ItemFilters({
  action,
  categories,
  query,
  category,
  sort,
  status,
  hidden = {},
  clearHref,
}: {
  action: string;
  categories: string[];
  query: string;
  category: string;
  /** Null hides the sort control, for a list whose order is fixed. */
  sort: ItemSortKey | null;
  /** Null hides the status control, for a list that already shows one state. */
  status: ItemStatusFilter | null;
  /** Choices to carry through that this form has no control for. */
  hidden?: Record<string, string | undefined>;
  clearHref: string;
}) {
  const dirty =
    Boolean(query) ||
    Boolean(category) ||
    (sort !== null && sort !== "ending") ||
    (status !== null && status !== "all");

  return (
    // Keyed on what is in force. These controls are uncontrolled, so React
    // would otherwise keep whatever the DOM held across a client-side
    // navigation — after Clear the list would be unfiltered while the
    // dropdowns still claimed a category and a sort.
    <form
      key={`${query}|${category}|${sort ?? ""}|${status ?? ""}`}
      className="card mb-5 flex flex-wrap items-end gap-3 p-4"
      action={action}
    >
      {Object.entries(hidden).map(
        ([name, value]) =>
          value && <input key={name} type="hidden" name={name} value={value} />
      )}

      <div className="min-w-[12rem] flex-1">
        <label className="label" htmlFor="q">
          Search
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="Bag, guitar, member's name…"
          className="field"
        />
      </div>

      {categories.length > 0 && (
        <div className="w-40">
          <label className="label" htmlFor="category">
            Category
          </label>
          <select id="category" name="category" defaultValue={category} className="field">
            <option value="">All</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {status !== null && (
        <div className="w-40">
          <label className="label" htmlFor="status">
            Show
          </label>
          <select id="status" name="status" defaultValue={status} className="field">
            {Object.entries(ITEM_STATUS_FILTERS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {sort !== null && (
        <div className="w-44">
          <label className="label" htmlFor="sort">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="field">
            {Object.entries(ITEM_SORTS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" className="btn-primary">
        Apply
      </button>
      {dirty && (
        <Link href={clearHref} className="btn-secondary">
          Clear
        </Link>
      )}
    </form>
  );
}
