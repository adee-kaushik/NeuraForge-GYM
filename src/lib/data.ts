import { prisma } from '@/lib/prisma';
import { toCheckInRecord, toMemberRecord, toTransactionRecord } from '@/lib/records';
import type { CheckInRecord } from '@/types';

// Every query here is limited to one gym (gymId comes from the logged-in user, never from the browser).

export async function loadMemberRecords(gymId: string) {
  const rows = await prisma.member.findMany({
    where: { gymId },
    include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toMemberRecord);
}

export async function loadTransactionRecords(gymId: string) {
  const rows = await prisma.payment.findMany({
    where: { gymId },
    include: { member: true, membership: { include: { plan: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return rows.map(toTransactionRecord);
}

// Check-ins from the start of this month (or the last 7 days, whichever reaches further back).
// Needed for the dashboard chart and each member's "visits this month".
export async function loadCheckInRecords(gymId: string): Promise<CheckInRecord[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const since = monthStart < weekAgo ? monthStart : weekAgo;

  const rows = await prisma.attendance.findMany({
    where: { gymId, checkedInAt: { gte: since } },
    orderBy: { checkedInAt: 'desc' },
    take: 10000,
  });
  return rows.map(toCheckInRecord);
}
