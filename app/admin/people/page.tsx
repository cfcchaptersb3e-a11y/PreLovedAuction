import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePageCapability } from "@/lib/page-guards";
import { formatMoney } from "@/lib/money";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePageCapability("people");

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
          Everyone who has signed up. Change what someone is allowed to do with the role picker —
          give helpers the least access that lets them do their job, so nobody can break the
          auction by accident.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {ASSIGNABLE_ROLES.map((role) => (
            <div key={role} className="rounded-lg border border-line bg-white px-3 py-2">
              <dt className="font-semibold">{ROLE_LABELS[role]}</dt>
              <dd className="text-xs text-muted">{ROLE_DESCRIPTIONS[role]}</dd>
            </div>
          ))}
        </dl>
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

      {/* On a phone the role picker would sit off the right of a scrolling
          table, so the same rows are stacked instead. */}
      <div className="space-y-3 sm:hidden">
        {users.length === 0 && (
          <p className="card p-8 text-center text-muted">Nobody has signed up yet.</p>
        )}
        {users.map((user) => {
          const wonTotal = user.wonItems.reduce(
            (sum, item) => sum + (item.winningBidCents ?? 0),
            0
          );
          const currency = user.wonItems[0]?.event.currency ?? "PHP";
          return (
            <div key={user.id} className="card space-y-3 p-4">
              <div>
                <p className="font-semibold">{user.name || "—"}</p>
                <a href={`mailto:${user.email}`} className="break-all text-sm text-muted hover:underline">
                  {user.email}
                </a>
                {user.phone && <p className="text-sm text-muted">{user.phone}</p>}
              </div>
              <p className="text-xs text-muted">
                {user._count.bids} {user._count.bids === 1 ? "bid" : "bids"}
                {wonTotal > 0 && ` · ${formatMoney(wonTotal, currency)} won`}
              </p>
              <RoleSelect userId={user.id} role={user.role} isSelf={user.id === me?.id} />
            </div>
          );
        })}
      </div>

      <div className="hidden sm:block">
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
                    <RoleSelect userId={user.id} role={user.role} isSelf={user.id === me?.id} />
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
    </div>
  );
}
