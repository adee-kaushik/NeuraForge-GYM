import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { MemberNav } from '@/components/member/MemberNav';
import { MemberBannerHeader } from '@/components/member/MemberBannerHeader';
import { MemberQueriesView, type MemberQueryItem } from '@/components/member/MemberQueriesView';

export const dynamic = 'force-dynamic';

export default async function MemberQueriesPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/member/login');

  const { id: memberId, gymId } = member;

  const rawQueries = await prisma.memberQuery.findMany({
    where: { memberId, gymId },
    orderBy: { createdAt: 'desc' },
  });

  const formattedQueries: MemberQueryItem[] = rawQueries.map((q) => ({
    id: q.id,
    category: q.category,
    subject: q.subject,
    message: q.message,
    status: q.status,
    reply: q.reply,
    createdAt: q.createdAt.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  }));

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

        {/* Navigation Tabs */}
        <MemberNav />

        {/* Member Queries and Complaints Interface */}
        <MemberQueriesView gymName={member.gym.name} initialQueries={formattedQueries} />
      </div>
    </main>
  );
}
