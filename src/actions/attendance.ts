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

export type ScanCheckInResult =
  | {
      ok: true;
      checkIn: CheckInRecord;
      member: {
        id: string;
        name: string;
        memberCode: string;
        phone: string;
        planName: string;
        daysLeft: number;
      };
    }
  | { ok: false; error: string; memberName?: string };

export async function checkInByCode(rawInput: string): Promise<ScanCheckInResult> {
  const staff = await requireStaff();
  const gymId = staff.gymId;

  const trimmed = rawInput.trim();
  if (!trimmed) return { ok: false, error: 'Please enter or scan a code.' };

  // Parse QR format "NF:<slug>:<memberCode>" or plain member code/phone
  let memberCode = trimmed;
  if (trimmed.startsWith('NF:')) {
    const parts = trimmed.split(':');
    if (parts.length >= 3) {
      const qrSlug = parts[1].trim().toLowerCase();
      if (qrSlug && qrSlug !== staff.gym.slug.toLowerCase()) {
        return { ok: false, error: `Invalid pass: This QR code belongs to another gym (${qrSlug}).` };
      }
      memberCode = parts[2].trim();
    }
  }

  const member = await prisma.member.findFirst({
    where: {
      gymId,
      OR: [
        { memberCode: { equals: memberCode, mode: 'insensitive' } },
        { phone: { equals: memberCode.replace(/\D/g, '') } },
      ],
    },
    include: {
      memberships: {
        orderBy: { expiresAt: 'desc' },
        take: 1,
        include: { plan: true },
      },
    },
  });

  if (!member) {
    return { ok: false, error: `Member "${memberCode}" not found in this gym.` };
  }

  const now = new Date();
  const latest = member.memberships[0];
  if (!latest || latest.expiresAt < now) {
    return {
      ok: false,
      error: `Membership for ${member.name} has expired. Please renew first.`,
      memberName: member.name,
    };
  }

  const alreadyIn = await prisma.attendance.findFirst({
    where: { gymId, memberId: member.id, checkedInAt: { gte: startOfDayIST(now) } },
  });
  if (alreadyIn) {
    return {
      ok: false,
      error: `${member.name} is already marked present today.`,
      memberName: member.name,
    };
  }

  const row = await prisma.attendance.create({
    data: { gymId, memberId: member.id, checkedInAt: now },
  });

  const daysLeft = Math.round(
    (startOfDayIST(latest.expiresAt).getTime() - startOfDayIST(now).getTime()) / 86400000
  );

  return {
    ok: true,
    checkIn: toCheckInRecord(row),
    member: {
      id: member.id,
      name: member.name,
      memberCode: member.memberCode,
      phone: member.phone,
      planName: latest.plan.name,
      daysLeft,
    },
  };
}
