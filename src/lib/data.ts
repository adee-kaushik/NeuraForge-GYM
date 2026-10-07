import { prisma } from '@/lib/prisma';
import { toMemberRecord, toTransactionRecord } from '@/lib/records';

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
