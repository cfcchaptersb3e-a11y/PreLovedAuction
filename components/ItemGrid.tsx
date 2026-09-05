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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} currency={currency} />
      ))}
    </div>
  );
}
