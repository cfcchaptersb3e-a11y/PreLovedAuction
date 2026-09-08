import { ItemCard, type ItemCardData } from "@/components/ItemCard";

export function ItemGrid({ items, currency }: { items: ItemCardData[]; currency: string }) {
  if (items.length === 0) {
    return (
      <div className="card p-10 text-center text-muted">
        <p className="text-3xl" aria-hidden>
          📦
        </p>
        <p className="mt-2 font-medium text-ink">Nothing here yet</p>
        <p className="mt-1 text-sm">Check back soon — organizers are still adding items.</p>
      </div>
    );
  }

  return (
    // Two to a row on a phone. One per row turns a hundred items into a very
    // long thumb-scroll, and the card is built to survive the narrower column.
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} currency={currency} />
      ))}
    </div>
  );
}
