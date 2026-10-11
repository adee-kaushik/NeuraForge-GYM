'use server';

import { prisma } from '@/lib/prisma';
import { isNeuraFitnessAdmin } from '@/lib/admin';
import { revalidatePath } from 'next/cache';

const DAY_MS = 86400000;

export async function approveSaaSSubscription(gymId: string, plan = 'SEMI_ANNUAL', durationMonths = 6) {
  if (!(await isNeuraFitnessAdmin())) {
    return { ok: false, error: 'Unauthorized: Admin cockpit access required.' };
  }

  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!gym) return { ok: false, error: 'Gym not found.' };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMonths * 30 * DAY_MS);

  await prisma.gym.update({
    where: { id: gymId },
    data: {
      saasPlan: plan,
      saasStatus: 'ACTIVE',
      saasApprovedAt: now,
      saasExpiresAt: expiresAt,
      isSuspended: false,
    },
  });

  // Automatically dispatch notification to gym owner's navigation bar
  const planName = plan === 'ANNUAL' ? '1-Year Annual Pro' : plan === 'SEMI_ANNUAL' ? '6-Month Semi-Annual' : plan;
  await prisma.adminMessage.create({
    data: {
      gymId,
      title: '🎉 SaaS Subscription Approved & Services Activated!',
      message: `Your ${gym.name} subscription (${planName}) is now officially approved and fully active until ${expiresAt.toLocaleDateString('en-IN')}. All member biometric links, payments, and features are unlocked.`,
      priority: 'HIGH',
    },
  });

  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, message: `Subscription approved for ${gym.name}.` };
}

export async function toggleGymSuspension(gymId: string, suspend: boolean, reason?: string) {
  if (!(await isNeuraFitnessAdmin())) {
    return { ok: false, error: 'Unauthorized.' };
  }

  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!gym) return { ok: false, error: 'Gym not found.' };

  await prisma.gym.update({
    where: { id: gymId },
    data: {
      isSuspended: suspend,
      saasStatus: suspend ? 'SUSPENDED' : 'ACTIVE',
    },
  });

  if (suspend) {
    await prisma.adminMessage.create({
      data: {
        gymId,
        title: '⚠️ Important Notice: Account Suspended',
        message: reason || 'Your gym management portal has been temporarily suspended by NeuraFitness Administration. Please reach out to founders to resolve dues or compliance.',
        priority: 'URGENT',
      },
    });
  } else {
    await prisma.adminMessage.create({
      data: {
        gymId,
        title: '✅ Account Re-activated',
        message: 'Your gym management portal has been re-activated by NeuraFitness Administration.',
        priority: 'HIGH',
      },
    });
  }

  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, isSuspended: suspend };
}

export async function sendAdminMessage(data: {
  gymId: string | null;
  title: string;
  message: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
}) {
  if (!(await isNeuraFitnessAdmin())) {
    return { ok: false, error: 'Unauthorized.' };
  }

  const title = data.title.trim();
  const message = data.message.trim();
  if (!title || !message) {
    return { ok: false, error: 'Title and message cannot be empty.' };
  }

  const msg = await prisma.adminMessage.create({
    data: {
      gymId: data.gymId || null,
      title,
      message,
      priority: data.priority || 'NORMAL',
    },
  });

  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, messageId: msg.id };
}

export async function replyToOwnerFeedback(feedbackId: string, replyText: string, markResolved = true) {
  if (!(await isNeuraFitnessAdmin())) {
    return { ok: false, error: 'Unauthorized.' };
  }

  const feedback = await prisma.ownerFeedback.findUnique({
    where: { id: feedbackId },
    include: { gym: true },
  });
  if (!feedback) return { ok: false, error: 'Feedback record not found.' };

  const trimmedReply = replyText.trim();
  if (!trimmedReply) return { ok: false, error: 'Reply text cannot be empty.' };

  await prisma.ownerFeedback.update({
    where: { id: feedbackId },
    data: {
      adminReply: trimmedReply,
      status: markResolved ? 'RESOLVED' : 'IN_REVIEW',
    },
  });

  // Also deliver as a message straight into the gym owner's nav bar notifications
  await prisma.adminMessage.create({
    data: {
      gymId: feedback.gymId,
      title: `Reply to: "${feedback.subject}"`,
      message: `NeuraFitness Founders: "${trimmedReply}"`,
      priority: 'HIGH',
    },
  });

  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true };
}

export async function fetchGymMembersForAdmin(gymId: string) {
  if (!(await isNeuraFitnessAdmin())) {
    return { ok: false, error: 'Unauthorized', members: [] };
  }

  const members = await prisma.member.findMany({
    where: { gymId },
    orderBy: { joinedAt: 'desc' },
    include: {
      memberships: {
        orderBy: { expiresAt: 'desc' },
        take: 1,
        include: { plan: true },
      },
      _count: {
        select: { attendances: true, payments: true },
      },
    },
  });

  const formatted = members.map((m) => {
    const activeMem = m.memberships[0];
    const isCurrent = activeMem ? new Date(activeMem.expiresAt).getTime() >= Date.now() : false;
    return {
      id: m.id,
      name: m.name,
      code: m.memberCode,
      phone: m.phone,
      email: m.email,
      joinedAt: m.joinedAt.toISOString(),
      planName: activeMem?.plan.name || 'No active plan',
      expiresAt: activeMem ? activeMem.expiresAt.toISOString() : null,
      status: isCurrent ? 'ACTIVE' : 'EXPIRED',
      totalCheckIns: m._count.attendances,
      totalPayments: m._count.payments,
    };
  });

  return { ok: true, members: formatted };
}
