'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { startOfDayIST } from '@/lib/format';

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
      type: customTitle === 'Payment Reminder' ? 'PAYMENT_DUE' : 'EXPIRY',
    },
  });

  return { ok: true };
}

export async function sendBulkMemberReminders(
  memberIds: string[],
  templateText?: string
): Promise<{ ok: boolean; count: number; error?: string }> {
  const staff = await requireStaff();

  if (!memberIds || memberIds.length === 0) {
    return { ok: false, count: 0, error: 'No members selected.' };
  }

  const members = await prisma.member.findMany({
    where: {
      id: { in: memberIds },
      gymId: staff.gymId,
    },
    include: {
      memberships: {
        orderBy: { expiresAt: 'desc' },
        take: 1,
        include: { plan: true },
      },
    },
  });

  const remindersData = members.map((m) => {
    const latest = m.memberships[0];
    const planName = latest?.plan?.name || 'Membership Plan';
    const expiryStr = latest
      ? latest.expiresAt.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Soon';

    const defaultMsg = `Hi ${m.name}, your ${staff.gym.name} (${planName}) membership is expiring on ${expiryStr}. Please renew to continue your workouts! 🏋️‍♂️💪`;

    const message = templateText
      ? templateText
          .replace(/\{name\}/g, m.name)
          .replace(/\{gym\}/g, staff.gym.name)
          .replace(/\{plan\}/g, planName)
          .replace(/\{expiryDate\}/g, expiryStr)
      : defaultMsg;

    return {
      gymId: staff.gymId,
      memberId: m.id,
      title: 'Membership Renewal Reminder',
      message,
      type: 'EXPIRY',
    };
  });

  if (remindersData.length > 0) {
    await prisma.gymReminder.createMany({
      data: remindersData,
    });
  }

  return { ok: true, count: remindersData.length };
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

/** Deliver one campaign to exactly the selected, gym-scoped recipients. */
export async function sendMemberCampaign(memberIds: string[], template: string, campaign = 'announcement') {
  const staff = await requireStaff();
  if (!Array.isArray(memberIds) || !memberIds.length || memberIds.length > 2000 || memberIds.some(id => typeof id !== 'string' || id.length > 100) || typeof template !== 'string' || !template.trim() || template.length > 5000) {
    return { ok: false, count: 0, error: 'Choose 1–2000 members and enter a message (up to 5000 characters).' };
  }
  const members = await prisma.member.findMany({ where: { id: { in: [...new Set(memberIds)] }, gymId: staff.gymId }, include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1, include: { plan: true } } } });
  if (!members.length) return { ok: false, count: 0, error: 'No matching gym members.' };
  const titles: Record<string, string> = { renewal: 'Membership Renewal Reminder', announcement: 'Gym Notice', birthday: 'Birthday wishes', welcome: 'Welcome to your gym', inactivity: 'We miss you at the gym' };
  const data = members.map(member => {
    const latest = member.memberships[0];
    const tokens: Record<string, string> = { daysLeft: latest ? String(Math.round((startOfDayIST(latest.expiresAt).getTime() - startOfDayIST(new Date()).getTime()) / 86400000)) : '0', name: member.name, gym: staff.gym.name, plan: latest?.plan?.name || 'Membership', expiryDate: latest?.expiresAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) || 'Please contact reception' };
    return { gymId: staff.gymId, memberId: member.id, title: titles[campaign] || 'Gym Message', type: campaign === 'renewal' ? 'EXPIRY' : campaign === 'birthday' ? 'BIRTHDAY' : 'GENERAL', message: template.trim().replace(/\{(name|gym|plan|expiryDate|daysLeft)\}/g, (_, key) => tokens[key]) };
  });
  const result = await prisma.gymReminder.createMany({ data });
  return { ok: true, count: result.count };
}
