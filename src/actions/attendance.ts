'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { startOfDayIST } from '@/lib/format';
import { toCheckInRecord } from '@/lib/records';
import { membershipActiveAt, processPunches } from '@/lib/biometric';
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
  // Valid through the whole last day (IST), exactly like the biometric machines
  if (!latest || !membershipActiveAt(latest.expiresAt, now)) {
    const daysOverdue = latest
      ? Math.max(1, Math.round((startOfDayIST(now).getTime() - startOfDayIST(latest.expiresAt).getTime()) / 86400000))
      : 0;
    return {
      ok: false,
      error: `🚫 ACCESS DENIED: ${member.name}'s membership has EXPIRED${daysOverdue ? ` (${daysOverdue}d ago)` : ''}. Please renew first.`,
    };
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

  // Same pipeline as the machines: matches the biometric ID first, then member code, then phone.
  const [outcome] = await processPunches({
    gymId,
    punches: [{ pin: memberCode, punchedAt: new Date() }],
    source: 'MANUAL',
  });

  switch (outcome.status) {
    case 'GRANTED':
      return {
        ok: true,
        checkIn: { id: outcome.checkInId!, memberId: outcome.memberId!, checkedInAt: outcome.checkedInAt! },
        member: {
          id: outcome.memberId!,
          name: outcome.memberName!,
          memberCode: outcome.memberCode!,
          phone: outcome.phone ?? '',
          planName: outcome.planName ?? '',
          daysLeft: outcome.daysLeft ?? 0,
        },
      };
    case 'ALREADY_IN':
    case 'REPLAY':
      return { ok: false, error: `${outcome.memberName} is already marked present today.`, memberName: outcome.memberName };
    case 'EXPIRED':
      return {
        ok: false,
        error: `🚫 ACCESS DENIED: Membership for ${outcome.memberName} has EXPIRED${outcome.daysOverdue ? ` (${outcome.daysOverdue}d ago)` : ''}. Please renew first.`,
        memberName: outcome.memberName,
      };
    default:
      return { ok: false, error: `Member "${memberCode}" not found in this gym.` };
  }
}
