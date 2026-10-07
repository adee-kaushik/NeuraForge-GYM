'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { startOfDayIST } from '@/lib/format';
import { toCheckInRecord } from '@/lib/records';
import type { CheckInRecord } from '@/types';

export type CheckInResult = { ok: true; checkIn: CheckInRecord } | { ok: false; error: string };

export async function checkInMember(memberId: string): Promise<CheckInResult> {
  const staff = await requireStaff();
  const gymId = staff.gymId;

  // gymId in the query means a member of another gym can never be found here
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
  });
  if (!member) return { ok: false, error: 'Member not found.' };

  const now = new Date();
  const latest = member.memberships[0];
  if (!latest || latest.expiresAt < now) {
    return { ok: false, error: `${member.name}'s membership has expired. Renew first.` };
  }

  const alreadyIn = await prisma.attendance.findFirst({
    where: { gymId, memberId, checkedInAt: { gte: startOfDayIST(now) } },
  });
  if (alreadyIn) return { ok: false, error: `${member.name} is already marked present today.` };

  const row = await prisma.attendance.create({ data: { gymId, memberId, checkedInAt: now } });
  return { ok: true, checkIn: toCheckInRecord(row) };
}
