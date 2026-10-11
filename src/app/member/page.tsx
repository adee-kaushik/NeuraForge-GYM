import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { inr, isSameDay, startOfDayIST } from '@/lib/format';
import { statusFromDaysLeft } from '@/lib/mappers';
import { logoutMember } from './actions';
import { DigitalPassCard } from '@/components/member/DigitalPassCard';
import { MemberHeaderActions } from '@/components/member/MemberHeaderActions';

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
  const hasCheckedInToday = visits.length > 0 && isSameDay(visits[0].checkedInAt, now);

  return (
    <main className="min-h-screen bg-background text-on-surface px-5 py-10">
      <div className="mx-auto w-full max-w-md space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">{member.gym.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container border border-surface-container-high text-[10px] font-mono text-secondary">
                Code: {member.gym.slug}
              </span>
            </div>
            <h1 className="font-sora text-2xl font-bold mt-1">Hi, {member.name.split(' ')[0]}</h1>
            <p className="text-xs text-outline mt-1 font-mono">
              Member ID (Phone): <span className="text-on-surface font-bold">{member.phone}</span>
            </p>
          </div>
          <MemberHeaderActions
            gymCode={member.gym.slug}
            phone={member.phone}
            memberName={member.name}
          />
        </header>

        {/* Digital Gym Pass & QR / Biometrics */}
        <DigitalPassCard
          gymSlug={member.gym.slug}
          gymName={member.gym.name}
          memberCode={member.phone || member.memberCode}
          memberName={member.name}
          planName={membership ? membership.plan.name : 'No active plan'}
          expiryDateStr={membership ? dateIST(membership.expiresAt) : 'N/A'}
          daysLeft={daysLeft}
          statusLabel={status.label}
          statusStyle={status.style}
          hasCheckedInToday={hasCheckedInToday}
        />

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
            <p className={`font-sora text-2xl font-bold mt-2 ${pendingDue > 0 ? 'text-error' : 'text-tertiary'}`}>
              {inr(pendingDue)}
            </p>
          </div>
        </section>

        {/* Gym UPI Payment QR Card (Visible to members if owner has configured UPI/QR) */}
        {(member.gym.paymentQrUrl || member.gym.upiId) && (
          <section className="rounded-2xl border border-secondary/40 bg-surface-container-low p-6 space-y-4 shadow-[0_0_25px_rgba(123,208,255,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-2xl">qr_code_2</span>
                <div>
                  <h3 className="font-sora text-base font-bold text-on-surface">Pay Online via UPI</h3>
                  <p className="text-xs text-outline">Scan to pay membership fee &amp; dues</p>
                </div>
              </div>
              {pendingDue > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-error/15 text-error border border-error/30 text-xs font-bold">
                  {inr(pendingDue)} Due
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl shadow-md border border-surface-container-high shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    member.gym.paymentQrUrl ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `upi://pay?pa=${member.gym.upiId}&pn=${member.gym.name}${pendingDue > 0 ? `&am=${pendingDue}` : ''}&cu=INR`
                    )}`
                  }
                  alt={`${member.gym.name} UPI QR`}
                  className="w-36 h-36 object-contain"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                {member.gym.upiId && (
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-outline block">Gym UPI ID</span>
                    <span className="font-mono text-xs font-bold text-secondary select-all bg-surface-container px-2.5 py-1 rounded-lg border border-surface-container-high inline-block mt-0.5">
                      {member.gym.upiId}
                    </span>
                  </div>
                )}
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Open GPay, PhonePe, Paytm or any UPI app and scan this QR code to complete your payment directly to the gym.
                </p>
                {member.gym.upiId && (
                  <a
                    href={`upi://pay?pa=${member.gym.upiId}&pn=${encodeURIComponent(member.gym.name)}${
                      pendingDue > 0 ? `&am=${pendingDue}` : ''
                    }&cu=INR`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-[#001f28] font-bold text-xs shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    <span>Pay Now with UPI App</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

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
