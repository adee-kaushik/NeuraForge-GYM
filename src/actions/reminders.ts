'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';

export async function sendMemberReminder(
  memberId: string,
  customTitle?: string,
  customMessage?: string
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId: staff.gymId },
    include: {
      memberships: {
        orderBy: { expiresAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!member) {
    return { ok: false, error: 'Member not found.' };
  }

  const latestMembership = member.memberships[0];
  const expiryDateStr = latestMembership
    ? latestMembership.expiresAt.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const title = customTitle || 'Membership Renewal Reminder';
  const message =
    customMessage ||
    `Friendly reminder from ${staff.gym.name}: Your membership is set to expire on ${expiryDateStr}. Please visit the reception or scan the online UPI QR to renew your plan.`;

  await prisma.gymReminder.create({
    data: {
      gymId: staff.gymId,
      memberId: member.id,
      title,
      message,
      type: 'EXPIRY',
    },
  });

  return { ok: true };
}

export async function broadcastGymAnnouncement(
  title: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();

  if (!title.trim() || !message.trim()) {
    return { ok: false, error: 'Title and announcement message are required.' };
  }

  await prisma.gymReminder.create({
    data: {
      gymId: staff.gymId,
      memberId: null, // broadcast to all gym members
      title: title.trim(),
      message: message.trim(),
      type: 'ANNOUNCEMENT',
    },
  });

  return { ok: true };
}

export async function sendMemberBirthdayWish(
  memberId: string,
  customMessage?: string
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId: staff.gymId },
  });

  if (!member) {
    return { ok: false, error: 'Member not found.' };
  }

  const title = `🎂 Happy Birthday, ${member.name}!`;
  const message =
    customMessage?.trim() ||
    `Warmest birthday wishes from the entire team at ${staff.gym.name}! May this year bring you great health, strength, and joy. Keep crushing your fitness goals! 🎉💪`;

  await prisma.gymReminder.create({
    data: {
      gymId: staff.gymId,
      memberId: member.id,
      title,
      message,
      type: 'BIRTHDAY',
    },
  });

  return { ok: true };
}
