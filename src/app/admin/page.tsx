import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isNeuraFitnessAdmin } from '@/lib/admin';
import { startOfDayIST } from '@/lib/format';
import { AdminCockpitView, AdminGymRow, AdminFeedbackRow, AdminBroadcastRow } from '@/components/admin/AdminCockpitView';

const DAY_MS = 86400000;

export default async function AdminPage() {
  // Anyone else gets a normal 404 not found page
  if (!(await isNeuraFitnessAdmin())) {
    notFound();
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [gyms, activeRows, visitRows, lastVisits, feedbacks, broadcasts] = await Promise.all([
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
    prisma.ownerFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: { gym: { select: { id: true, name: true, slug: true } } },
      take: 50,
    }),
    prisma.adminMessage.findMany({
      orderBy: { createdAt: 'desc' },
      include: { gym: { select: { id: true, name: true, slug: true } } },
      take: 30,
    }),
  ]);

  const activeBy = new Map(activeRows.map((r) => [r.gymId, Number(r.n)]));
  const visitsBy = new Map(visitRows.map((r) => [r.gymId, r._count._all]));
  const lastVisitBy = new Map(lastVisits.map((r) => [r.gymId, r._max.checkedInAt]));

  const gymRows: AdminGymRow[] = gyms.map((g) => {
    const lastActive = lastVisitBy.get(g.id);
    const lastActiveDaysAgo = lastActive
      ? Math.round((startOfDayIST(now).getTime() - startOfDayIST(lastActive).getTime()) / DAY_MS)
      : null;

    const owner = g.users[0];

    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      ownerName: owner?.name ?? 'Unassigned',
      ownerEmail: owner?.email ?? '-',
      ownerPhone: owner?.phone ?? '',
      joined: g.createdAt.toISOString(),
      membersCount: g._count.members,
      activeMembersCount: activeBy.get(g.id) ?? 0,
      checkInsLast7d: visitsBy.get(g.id) ?? 0,
      lastActiveDaysAgo,
      saasPlan: g.saasPlan || 'TRIAL_14_DAYS',
      saasStatus: g.saasStatus || 'ACTIVE',
      saasExpiresAt: g.saasExpiresAt ? g.saasExpiresAt.toISOString() : null,
      saasApprovedAt: g.saasApprovedAt ? g.saasApprovedAt.toISOString() : null,
      isSuspended: g.isSuspended || false,
      subscriptionAmount: g.subscriptionAmount || 0,
    };
  });

  const feedbackRows: AdminFeedbackRow[] = feedbacks.map((f) => ({
    id: f.id,
    gymId: f.gymId,
    gymName: f.gym.name,
    gymSlug: f.gym.slug,
    category: f.category,
    subject: f.subject,
    message: f.message,
    status: f.status,
    adminReply: f.adminReply,
    createdAt: f.createdAt.toISOString(),
  }));

  const broadcastRows: AdminBroadcastRow[] = broadcasts.map((b) => ({
    id: b.id,
    gymId: b.gymId,
    gymName: b.gym ? b.gym.name : null,
    title: b.title,
    message: b.message,
    priority: b.priority,
    isRead: b.isRead,
    createdAt: b.createdAt.toISOString(),
  }));

  const stats = {
    totalGyms: gymRows.length,
    activeGyms: gymRows.filter((g) => g.saasStatus === 'ACTIVE' && !g.isSuspended).length,
    suspendedGyms: gymRows.filter((g) => g.isSuspended || g.saasStatus === 'SUSPENDED').length,
    totalMembers: gymRows.reduce((acc, g) => acc + g.membersCount, 0),
    activeMembers: gymRows.reduce((acc, g) => acc + g.activeMembersCount, 0),
    totalCheckIns7d: gymRows.reduce((acc, g) => acc + g.checkInsLast7d, 0),
    pendingApprovalsCount: gymRows.filter((g) => g.saasStatus === 'PENDING_APPROVAL').length,
    openFeedbacksCount: feedbackRows.filter((f) => f.status !== 'RESOLVED').length,
  };

  return (
    <AdminCockpitView
      gyms={gymRows}
      feedbacks={feedbackRows}
      broadcasts={broadcastRows}
      stats={stats}
    />
  );
}
