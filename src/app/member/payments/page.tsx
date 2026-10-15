import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { MemberNav } from '@/components/member/MemberNav';
import { MemberBannerHeader } from '@/components/member/MemberBannerHeader';
import {
  MemberPaymentsHistoryView,
  type MemberPaymentItem,
} from '@/components/member/MemberPaymentsHistoryView';

import { ensureDatabaseSchema } from '@/lib/db-init';

export const dynamic = 'force-dynamic';

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
        {/* Banner & Profile Header */}
        <MemberBannerHeader
          gymName={member.gym?.name || 'Your Gym'}
          gymSlug={member.gym?.slug || ''}
          gymBannerUrl={(member.gym as any)?.bannerUrl || null}
          gymTagline={(member.gym as any)?.tagline || null}
          memberName={member.name || 'Member'}
          memberPhone={member.phone || ''}
          memberPhotoUrl={(member as any)?.photoUrl || null}
        />

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
