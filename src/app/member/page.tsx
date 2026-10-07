import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { inr, startOfDayIST } from '@/lib/format';
import { statusFromDaysLeft } from '@/lib/mappers';
import { logoutMember } from './actions';

// Dates are shown in IST, because the server runs in UTC
const dateIST = (d: Date) =>
  d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
const timeIST = (d: Date) =>
  d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

const STATUS = {
  active: { label: 'Active', style: 'bg-tertiary/15 text-tertiary border-tertiary/30' },
  expiring: { label: 'Expiring soon', style: 'bg-secondary/15 text-secondary border-secondary/30' },
  expired: { label: 'Expired', style: 'bg-error/15 text-error border-error/30' },
};

const sectionTitle = 'text-xs font-bold uppercase tracking-wider text-outline mb-3';

export default async function MemberPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/member/login');

  const { id: memberId, gymId } = member;
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60000);
  const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 330 * 60000);

  // Every query is limited to this member and their gym
  const [membership, visits, visitsThisMonth, payments, pending] = await Promise.all([
    prisma.membership.findFirst({ where: { memberId, gymId }, orderBy: { expiresAt: 'desc' }, include: { plan: true } }),
    prisma.attendance.findMany({ where: { memberId, gymId }, orderBy: { checkedInAt: 'desc' }, take: 8 }),
    prisma.attendance.count({ where: { memberId, gymId, checkedInAt: { gte: monthStart } } }),
    prisma.payment.findMany({ where: { memberId, gymId }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.payment.aggregate({ where: { memberId, gymId, status: 'PENDING' }, _sum: { amount: true } }),
  ]);

  const daysLeft = membership
    ? Math.round((startOfDayIST(membership.expiresAt).getTime() - startOfDayIST(now).getTime()) / 86400000)
    : null;
  const status = STATUS[daysLeft === null ? 'expired' : statusFromDaysLeft(daysLeft)];
  const pendingDue = pending._sum.amount ?? 0;

  return (
    <main className="min-h-screen bg-background text-on-surface px-5 py-10">
      <div className="mx-auto w-full max-w-md space-y-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-outline">{member.gym.name}</p>
            <h1 className="font-sora text-2xl font-bold mt-1">Hi, {member.name.split(' ')[0]}</h1>
            <p className="text-sm text-outline mt-1">{member.memberCode}</p>
          </div>
          <form action={logoutMember}>
            <button className="text-xs font-bold text-secondary hover:underline cursor-pointer">Log out</button>
          </form>
        </header>

        <section className="rounded-2xl border border-secondary/30 bg-surface-container-low p-6 space-y-5 shadow-[0_0_24px_rgba(123,208,255,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-sora text-lg font-semibold">{membership ? membership.plan.name : 'No plan yet'}</h2>
            <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${status.style}`}>{status.label}</span>
          </div>
          {membership && daysLeft !== null ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-outline">Valid until</p>
              <p className="font-sora text-2xl font-bold mt-1">{dateIST(membership.expiresAt)}</p>
              <p className="text-sm text-on-surface-variant mt-1">
                {daysLeft < 0 ? 'Expired. Please contact your gym to renew.' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">Please contact your gym to start a plan.</p>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-5">
            <p className="text-xs uppercase tracking-wider text-outline">Visits this month</p>
            <p className="font-sora text-2xl font-bold mt-2">{visitsThisMonth}</p>
          </div>
          <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-5">
            <p className="text-xs uppercase tracking-wider text-outline">Pending due</p>
            <p className={`font-sora text-2xl font-bold mt-2 ${pendingDue > 0 ? 'text-error' : ''}`}>{inr(pendingDue)}</p>
          </div>
        </section>

        <section>
          <h2 className={sectionTitle}>Recent visits</h2>
          <div className="rounded-xl border border-surface-container-high bg-surface-container-low divide-y divide-surface-container-high">
            {visits.length > 0 ? (
              visits.map((v) => (
                <div key={v.id} className="px-5 py-3.5 flex items-center justify-between text-sm">
                  <span>{dateIST(v.checkedInAt)}</span>
                  <span className="text-on-surface-variant">{timeIST(v.checkedInAt)}</span>
                </div>
              ))
            ) : (
              <p className="px-5 py-4 text-sm text-outline">No visits yet.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className={sectionTitle}>Payments</h2>
          <div className="rounded-xl border border-surface-container-high bg-surface-container-low divide-y divide-surface-container-high">
            {payments.length > 0 ? (
              payments.map((p) => (
                <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold">{inr(p.amount)}</p>
                    <p className="text-xs text-outline mt-0.5">
                      {dateIST(p.createdAt)} · {p.mode} · {p.invoiceNo}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${p.status === 'PAID' ? 'text-tertiary' : 'text-error'}`}>
                    {p.status === 'PAID' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-5 py-4 text-sm text-outline">No payments yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
