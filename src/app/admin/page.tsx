import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isNeuraForgeAdmin } from '@/lib/admin';
import { startOfDayIST } from '@/lib/format';

const dateIST = (d: Date) =>
  d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

const DAY_MS = 86400000;

export default async function AdminPage() {
  // Anyone else gets a normal "not found" page, so the admin page is not even visible to them
  if (!(await isNeuraForgeAdmin())) notFound();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [gyms, activeRows, visitRows, lastVisits, lastPayments] = await Promise.all([
    prisma.gym.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true, users: true } },
        users: { where: { role: 'OWNER' }, select: { name: true, email: true, phone: true }, take: 1 },
      },
    }),
    prisma.$queryRaw<{ gymId: string; n: bigint }[]>`
      SELECT "gymId", COUNT(DISTINCT "memberId") AS n FROM "Membership" WHERE "expiresAt" >= ${now} GROUP BY "gymId"`,
    prisma.attendance.groupBy({ by: ['gymId'], where: { checkedInAt: { gte: weekAgo } }, _count: { _all: true } }),
    prisma.attendance.groupBy({ by: ['gymId'], _max: { checkedInAt: true } }),
    prisma.payment.groupBy({ by: ['gymId'], _max: { createdAt: true } }),
  ]);

  const activeBy = new Map(activeRows.map((r) => [r.gymId, Number(r.n)]));
  const visitsBy = new Map(visitRows.map((r) => [r.gymId, r._count._all]));
  const lastVisitBy = new Map(lastVisits.map((r) => [r.gymId, r._max.checkedInAt]));
  const lastPaymentBy = new Map(lastPayments.map((r) => [r.gymId, r._max.createdAt]));

  const rows = gyms.map((g) => {
    const times = [lastVisitBy.get(g.id), lastPaymentBy.get(g.id)].filter((t): t is Date => !!t);
    const lastActive = times.length ? new Date(Math.max(...times.map((t) => t.getTime()))) : null;
    const daysAgo = lastActive
      ? Math.round((startOfDayIST(now).getTime() - startOfDayIST(lastActive).getTime()) / DAY_MS)
      : null;
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      owner: g.users[0],
      joined: g.createdAt,
      members: g._count.members,
      staff: Math.max(g._count.users - 1, 0),
      active: activeBy.get(g.id) ?? 0,
      visits: visitsBy.get(g.id) ?? 0,
      daysAgo,
    };
  });

  const quiet = rows.filter((r) => r.daysAgo === null || r.daysAgo > 7).length;
  const stats = [
    { label: 'Gyms', value: rows.length },
    { label: 'Members', value: rows.reduce((s, r) => s + r.members, 0) },
    { label: 'Active members', value: rows.reduce((s, r) => s + r.active, 0) },
    { label: 'Check-ins, last 7 days', value: rows.reduce((s, r) => s + r.visits, 0) },
  ];

  return (
    <main className="min-h-screen bg-background text-on-surface px-5 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">NeuraForge admin</p>
            <h1 className="font-sora text-2xl font-bold mt-1">All gyms</h1>
            <p className="text-sm text-outline mt-1">
              {quiet > 0 ? `${quiet} gym${quiet === 1 ? ' has' : 's have'} had no activity in the last 7 days. Worth a call.` : 'Every gym was active in the last 7 days.'}
            </p>
          </div>
          <Link href="/" className="text-xs font-bold text-secondary hover:underline">Back to app</Link>
        </header>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-surface-container-high bg-surface-container-low p-5">
              <p className="text-xs uppercase tracking-wider text-outline">{s.label}</p>
              <p className="font-sora text-2xl font-bold mt-2">{s.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-surface-container-high bg-surface-container-low overflow-hidden">
          <table className="stack w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-outline border-b border-surface-container-high">
                {['Gym', 'Owner', 'Joined', 'Members', 'Active', 'Staff', 'Check-ins (7d)', 'Last activity'].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td className="px-4 py-6 text-outline">No gyms yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-surface-container-high last:border-0">
                  <td data-label="Gym" className="px-4 py-3">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-outline">code: {r.slug}</p>
                  </td>
                  <td data-label="Owner" className="px-4 py-3">
                    <p>{r.owner?.name ?? '-'}</p>
                    <p className="text-xs text-outline">{r.owner?.email}{r.owner?.phone ? ` · ${r.owner.phone}` : ''}</p>
                  </td>
                  <td data-label="Joined" className="px-4 py-3">{dateIST(r.joined)}</td>
                  <td data-label="Members" className="px-4 py-3">{r.members}</td>
                  <td data-label="Active" className="px-4 py-3">{r.active}</td>
                  <td data-label="Staff" className="px-4 py-3">{r.staff}</td>
                  <td data-label="Check-ins (7d)" className="px-4 py-3">{r.visits}</td>
                  <td data-label="Last activity" className={`px-4 py-3 font-semibold ${r.daysAgo === null || r.daysAgo > 7 ? 'text-error' : ''}`}>
                    {r.daysAgo === null ? 'No activity yet' : r.daysAgo <= 0 ? 'Today' : `${r.daysAgo} day${r.daysAgo === 1 ? '' : 's'} ago`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
