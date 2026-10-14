import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { MemberNav } from '@/components/member/MemberNav';
import { MemberHeaderActions } from '@/components/member/MemberHeaderActions';
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
        {/* Top Header */}
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

        {/* Navigation Tabs */}
        <MemberNav />

        {/* Member Queries and Complaints Interface */}
        <MemberQueriesView gymName={member.gym.name} initialQueries={formattedQueries} />
      </div>
    </main>
  );
}
