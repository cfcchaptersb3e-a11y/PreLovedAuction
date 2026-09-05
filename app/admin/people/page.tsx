import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { RoleToggle } from "@/components/admin/RoleToggle";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const me = await getCurrentUser();

  const users = await db.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: { select: { bids: true } },
      wonItems: { select: { winningBidCents: true, event: { select: { currency: true } } } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">People</h2>
        <p className="text-sm text-muted">
          Everyone who has signed in to bid. Organisers listed in the ADMIN_EMAILS setting are made
          admins automatically the first time they sign in.
        </p>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4" action="/admin/people">
        <div className="min-w-[14rem] flex-1">
          <label className="label" htmlFor="q">
            Search by name or email
          </label>
          <input id="q" name="q" defaultValue={query} className="field" />
        </div>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-line bg-parchment/60 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 text-right font-semibold">Bids</th>
              <th className="px-4 py-3 text-right font-semibold">Won</th>
              <th className="px-4 py-3 font-semibold">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => {
              const wonTotal = user.wonItems.reduce(
                (sum, item) => sum + (item.winningBidCents ?? 0),
                0
              );
              const currency = user.wonItems[0]?.event.currency ?? "PHP";
              return (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.name || "—"}</td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${user.email}`} className="hover:underline">
                      {user.email}
                    </a>
                    {user.phone && <p className="text-xs text-muted">{user.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">{user._count.bids}</td>
                  <td className="px-4 py-3 text-right">
                    {wonTotal > 0 ? formatMoney(wonTotal, currency) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`chip ${user.role === "ADMIN" ? "bg-forest-light text-forest" : "bg-parchment text-muted"}`}
                      >
                        {user.role === "ADMIN" ? "Organiser" : "Bidder"}
                      </span>
                      {user.id !== me?.id && (
                        <RoleToggle userId={user.id} isAdmin={user.role === "ADMIN"} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Nobody has signed in yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
