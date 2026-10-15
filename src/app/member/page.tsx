import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { inr, isSameDay, startOfDayIST } from '@/lib/format';
import { statusFromDaysLeft } from '@/lib/mappers';
import { DigitalPassCard } from '@/components/member/DigitalPassCard';
import { MemberBannerHeader } from '@/components/member/MemberBannerHeader';
import { MemberNav } from '@/components/member/MemberNav';
import { MemberNotifications, type NotificationItem } from '@/components/member/MemberNotifications';
import { MemberPaymentQrSection } from '@/components/member/MemberPaymentQrSection';

import { ensureDatabaseSchema } from '@/lib/db-init';

// Dates are shown in IST, because the server runs in UTC
const dateIST = (d: any) => {
  if (!d) return 'N/A';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return 'N/A';
  return dt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
};
const timeIST = (d: any) => {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
};

const STATUS = {
  active: { label: 'Active', style: 'bg-tertiary/15 text-tertiary border-tertiary/30' },
  expiring: { label: 'Expiring soon', style: 'bg-secondary/15 text-secondary border-secondary/30' },
  expired: { label: 'Expired', style: 'bg-error/15 text-error border-error/30' },
};

const sectionTitle = 'text-xs font-bold uppercase tracking-wider text-outline mb-3';

export const dynamic = 'force-dynamic';

export default async function MemberPage() {
  await ensureDatabaseSchema().catch(() => {});
  const member = await getCurrentMember();
  if (!member) redirect('/member/login');

  const { id: memberId, gymId } = member;
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60000);
  const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 330 * 60000);

  // Every query is limited to this member and their gym
  const [membership, visits, visitsThisMonth, payments, pending, rawReminders] = await Promise.all([
    prisma.membership.findFirst({ where: { memberId, gymId }, orderBy: { expiresAt: 'desc' }, include: { plan: true } }).catch(() => null),
    prisma.attendance.findMany({ where: { memberId, gymId }, orderBy: { checkedInAt: 'desc' }, take: 8 }).catch(() => []),
    prisma.attendance.count({ where: { memberId, gymId, checkedInAt: { gte: monthStart } } }).catch(() => 0),
    prisma.payment.findMany({ where: { memberId, gymId }, orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
    prisma.payment.aggregate({ where: { memberId, gymId, status: 'PENDING' }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
    prisma.gymReminder.findMany({
      where: {
        gymId,
        OR: [{ memberId }, { memberId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }).catch(() => []),
  ]);

  const daysLeft = membership
    ? Math.round((startOfDayIST(membership.expiresAt).getTime() - startOfDayIST(now).getTime()) / 86400000)
    : null;
  const status = STATUS[daysLeft === null ? 'expired' : statusFromDaysLeft(daysLeft)];
  const pendingDue = pending._sum.amount ?? 0;
  const hasCheckedInToday = visits.length > 0 && visits[0]?.checkedInAt && isSameDay(visits[0].checkedInAt, now);

  const formattedReminders: NotificationItem[] = rawReminders.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    type: r.type as NotificationItem['type'],
    createdAt: r.createdAt instanceof Date
      ? r.createdAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })
      : String(r.createdAt || ''),
  }));

  const gymName = member.gym?.name || 'Your Gym';
  const gymSlug = member.gym?.slug || '';
  const gymBannerUrl = (member.gym as any)?.bannerUrl || null;
  const gymTagline = (member.gym as any)?.tagline || null;
  const memberPhotoUrl = (member as any)?.photoUrl || null;

  return (
    <main className="min-h-screen bg-background text-on-surface px-4 sm:px-6 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-md space-y-6 sm:space-y-7">
        {/* Gym Banner & Member Profile Picture Header */}
        <MemberBannerHeader
          gymName={gymName}
          gymSlug={gymSlug}
          gymBannerUrl={gymBannerUrl}
          gymTagline={gymTagline}
          memberName={member.name || 'Member'}
          memberPhone={member.phone || ''}
          memberPhotoUrl={memberPhotoUrl}
        />

        {/* Member Portal Navigation Tabs */}
        <MemberNav />

        {/* Notifications & Owner Reminders Alert Banner (Requirement 5) */}
        <MemberNotifications
          notifications={formattedReminders}
          gymName={gymName}
          pendingDue={pendingDue}
          daysLeft={daysLeft}
          expiryDateStr={membership ? dateIST(membership.expiresAt) : 'N/A'}
        />

        {/* Digital Biometric Pass & Optional QR Toggle (Requirement 4) */}
        <DigitalPassCard
          gymSlug={gymSlug}
          gymName={gymName}
          memberCode={member.phone || member.memberCode}
          memberName={member.name || 'Member'}
          planName={membership?.plan?.name || 'No active plan'}
          expiryDateStr={membership && membership.expiresAt ? dateIST(membership.expiresAt) : 'N/A'}
          daysLeft={daysLeft}
          statusLabel={status.label}
          statusStyle={status.style}
          hasCheckedInToday={Boolean(hasCheckedInToday)}
          photoUrl={memberPhotoUrl}
        />

        {/* Active Plan Card */}
        <section className="rounded-2xl border border-secondary/30 bg-surface-container-low p-6 space-y-5 shadow-[0_0_24px_rgba(123,208,255,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-sora text-lg font-semibold">{membership?.plan?.name || 'No plan yet'}</h2>
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

        {/* Quick Metrics */}
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-5">
            <p className="text-xs uppercase tracking-wider text-outline font-bold">Visits this month</p>
            <p className="font-sora text-2xl font-bold mt-2">{visitsThisMonth}</p>
          </div>
          <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-5">
            <p className="text-xs uppercase tracking-wider text-outline font-bold">Pending due</p>
            <p className={`font-sora text-2xl font-bold mt-2 ${pendingDue > 0 ? 'text-error' : 'text-tertiary'}`}>
              {inr(pendingDue)}
            </p>
          </div>
        </section>

        {/* Owner's Official UPI QR & Payment Section (Requirement 2: Always Visible) */}
        <MemberPaymentQrSection
          gymName={gymName}
          upiId={member.gym?.upiId || null}
          paymentQrUrl={member.gym?.paymentQrUrl || null}
          pendingDue={pendingDue}
        />

        {/* Recent Visits Section */}
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

        {/* Payments Preview with Link to Full Payment History (Requirement 1) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-outline">Recent Payments</h2>
            <Link
              href="/member/payments"
              className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
            >
              <span>Full Payment History</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

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
