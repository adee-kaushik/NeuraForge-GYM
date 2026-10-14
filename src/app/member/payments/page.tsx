import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { MemberNav } from '@/components/member/MemberNav';
import { MemberHeaderActions } from '@/components/member/MemberHeaderActions';
import {
  MemberPaymentsHistoryView,
  type MemberPaymentItem,
} from '@/components/member/MemberPaymentsHistoryView';

import { ensureDatabaseSchema } from '@/lib/db-init';

export default async function MemberPaymentsPage() {
  await ensureDatabaseSchema().catch(() => {});
  const member = await getCurrentMember();
  if (!member) redirect('/member/login');

  const { id: memberId, gymId } = member;

  const [rawPayments, paidAgg, pendingAgg] = await Promise.all([
    prisma.payment
      .findMany({
        where: { memberId, gymId },
        orderBy: { createdAt: 'desc' },
        include: { membership: { include: { plan: true } } },
      })
      .catch(async () => {
        try {
          await ensureDatabaseSchema();
          return await prisma.payment.findMany({
            where: { memberId, gymId },
            orderBy: { createdAt: 'desc' },
            include: { membership: { include: { plan: true } } },
          });
        } catch {
          return [];
        }
      }),
    prisma.payment
      .aggregate({
        where: { memberId, gymId, status: 'PAID' },
        _sum: { amount: true },
      })
      .catch(() => ({ _sum: { amount: 0 } })),
    prisma.payment
      .aggregate({
        where: { memberId, gymId, status: 'PENDING' },
        _sum: { amount: true },
      })
      .catch(() => ({ _sum: { amount: 0 } })),
  ]);

  const formattedPayments: MemberPaymentItem[] = rawPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    gstAmount: p.gstAmount,
    mode: p.mode,
    status: p.status,
    invoiceNo: p.invoiceNo,
    planName: p.membership?.plan.name || 'Membership Plan',
    dateStr: p.createdAt.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    timeStr: p.createdAt.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  const totalPaid = paidAgg._sum.amount ?? 0;
  const pendingDue = pendingAgg._sum.amount ?? 0;

  return (
    <main className="min-h-screen bg-background text-on-surface px-5 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Header */}
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
              Member ID: <span className="text-on-surface font-bold">{member.phone}</span>
            </p>
          </div>
          <MemberHeaderActions
            gymCode={member.gym.slug}
            phone={member.phone}
            memberName={member.name}
          />
        </header>

        {/* Member Navigation Tabs */}
        <MemberNav />

        {/* Payment History View */}
        <MemberPaymentsHistoryView
          gymName={member.gym.name}
          upiId={member.gym.upiId}
          paymentQrUrl={member.gym.paymentQrUrl}
          totalPaid={totalPaid}
          pendingDue={pendingDue}
          payments={formattedPayments}
        />
      </div>
    </main>
  );
}
