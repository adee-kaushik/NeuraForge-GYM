import { prisma } from '@/lib/prisma';
import { toCheckInRecord, toMemberRecord, toTransactionRecord } from '@/lib/records';
import type { CheckInRecord, MemberRecord, TransactionRecord } from '@/types';
import { startOfDayIST } from '@/lib/format';

export async function loadMemberRecords(gymId: string): Promise<MemberRecord[]> {
  const rows = await prisma.member.findMany({ where: { gymId }, include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } });
  return rows.map(toMemberRecord);
}

export async function loadTransactionRecords(gymId: string): Promise<TransactionRecord[]> {
  const rows = await prisma.payment.findMany({ where: { gymId }, include: { member: true, membership: { include: { plan: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
  return rows.map(toTransactionRecord);
}

export async function loadCheckInRecords(gymId: string): Promise<CheckInRecord[]> {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60000);
  const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 330 * 60000);
  const weekAgo = startOfDayIST(new Date(now.getTime() - 7 * 86400000));
  const since = monthStart < weekAgo ? monthStart : weekAgo;
  const rows = await prisma.attendance.findMany({ where: { gymId, checkedInAt: { gte: since } }, orderBy: { checkedInAt: 'desc' } });
  return rows.map(toCheckInRecord);
}
