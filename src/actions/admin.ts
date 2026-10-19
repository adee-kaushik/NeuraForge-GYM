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

export async function deleteGymMemberByAdmin(gymId: string, memberId: string) {
  if (!(await isNeuraFitnessAdmin())) {
    return { ok: false, error: 'Unauthorized: Admin cockpit clearance required.' };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: { id: true, authUserId: true, name: true, memberCode: true },
  });

  if (!member) {
    return { ok: false, error: 'Member not found in this gym.' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete associated attendances
      await tx.attendance.deleteMany({ where: { memberId } });
      // 2. Delete member queries
      await tx.memberQuery.deleteMany({ where: { memberId } });
      // 3. Delete gym reminders targeted to this member
      await tx.gymReminder.deleteMany({ where: { memberId } });
      // 4. Delete payments recorded for this member
      await tx.payment.deleteMany({ where: { memberId } });
      // 5. Delete memberships
      await tx.membership.deleteMany({ where: { memberId } });
      // 6. Delete member record
      await tx.member.delete({ where: { id: memberId } });
    });

    if (member.authUserId) {
      try {
        const { createAdminClient } = await import('@/utils/supabase/admin');
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(member.authUserId);
      } catch {
        // Safe to ignore if supabase secret role is not available
      }
    }

    revalidatePath('/admin');
    revalidatePath('/');
    return { ok: true, message: `Member ${member.name} (${member.memberCode}) was deleted.` };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Failed to delete member data.' };
  }
}

export async function createGymByAdmin(input: {
  gymName: string;
  slug: string;
  ownerName: string;
  email: string;
  phone?: string;
  password?: string;
  saasPlan: string;
  subscriptionAmount?: number;
  durationMonths?: number;
}) {
  if (!(await isNeuraFitnessAdmin())) {
    return { ok: false, error: 'Unauthorized: Admin cockpit clearance required.' };
  }

  const gymName = input.gymName.trim();
  const slug = input.slug.trim().toLowerCase();
  const ownerName = input.ownerName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const password = input.password || '';
  if (password.length < 12) return { ok: false, error: 'Provide a unique password of at least 12 characters.' };
  const saasPlan = input.saasPlan || 'SEMI_ANNUAL';
  const durationMonths = input.durationMonths || (saasPlan === 'ANNUAL' ? 12 : 6);
  const subscriptionAmount = input.subscriptionAmount ?? (saasPlan === 'ANNUAL' ? 5000 : 3000);

  if (!gymName || !slug || !ownerName || !email) {
    return { ok: false, error: 'Please provide Gym Name, Slug, Owner Name, and Email.' };
  }

  const existingSlug = await prisma.gym.findUnique({ where: { slug } });
  if (existingSlug) {
    return { ok: false, error: `Gym code / slug "${slug}" is already taken.` };
  }

  let authUserId = '';
  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const admin = createAdminClient();
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created?.user) {
      authUserId = created.user.id;
    }
  } catch {}

  if (!authUserId) {
    try {
      const { createClient } = await import('@/utils/supabase/server');
      const supabase = await createClient();
      const { data: publicCreated } = await supabase.auth.signUp({ email, password });
      if (publicCreated?.user) {
        authUserId = publicCreated.user.id;
      }
    } catch {}
  }

  if (!authUserId) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { ok: false, error: `A user with email "${email}" is already registered.` };
    }
    return { ok: false, error: 'Could not create auth account. Please verify credentials.' };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMonths * 30 * DAY_MS);

  const { DEFAULT_PLANS } = await import('@/lib/default-plans');

  const gym = await prisma.gym.create({
    data: {
      name: gymName,
      slug,
      saasPlan,
      saasStatus: 'ACTIVE',
      saasApprovedAt: now,
      saasExpiresAt: expiresAt,
      isSuspended: false,
      subscriptionAmount,
      users: {
        create: {
          authUserId,
          name: ownerName,
          email,
          phone,
          role: 'OWNER',
        },
      },
      plans: {
        create: DEFAULT_PLANS,
      },
    },
  });

  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, gymId: gym.id, message: `Gym "${gymName}" successfully created and approved!` };
}
