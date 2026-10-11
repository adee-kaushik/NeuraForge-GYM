'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper to get authenticated gym owner/staff
async function getAuthenticatedGymId(): Promise<{ gymId: string; userId: string; userEmail: string; userName: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: data.user.id },
    include: { gym: true },
  });

  if (!dbUser) return null;

  return {
    gymId: dbUser.gymId,
    userId: dbUser.id,
    userEmail: dbUser.email,
    userName: dbUser.name,
  };
}

export interface SubmitOwnerFeedbackInput {
  category: 'FEATURE_REQUEST' | 'BUG_REPORT' | 'BILLING_SUBSCRIPTION' | 'HARDWARE_BIOMETRIC' | 'OTHER';
  subject: string;
  message: string;
}

export async function submitOwnerFeedback(input: SubmitOwnerFeedbackInput) {
  const auth = await getAuthenticatedGymId();
  if (!auth) {
    return { ok: false, error: 'Unauthorized. Please log in as gym owner.' };
  }

  const subject = input.subject.trim();
  const message = input.message.trim();

  if (!subject || !message) {
    return { ok: false, error: 'Subject and message are required.' };
  }

  try {
    const feedback = await prisma.ownerFeedback.create({
      data: {
        gymId: auth.gymId,
        category: input.category,
        subject,
        message,
        status: 'OPEN',
      },
    });

    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true, feedbackId: feedback.id };
  } catch (err: any) {
    console.error('Failed to submit owner feedback:', err);
    return { ok: false, error: 'Failed to submit feedback. Please try again.' };
  }
}

export async function getOwnerFeedbackHistory() {
  const auth = await getAuthenticatedGymId();
  if (!auth) return [];

  const list = await prisma.ownerFeedback.findMany({
    where: { gymId: auth.gymId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return list.map((item) => ({
    id: item.id,
    category: item.category,
    subject: item.subject,
    message: item.message,
    status: item.status,
    adminReply: item.adminReply,
    createdAt: item.createdAt.toISOString(),
  }));
}

export async function getOwnerAdminNotifications() {
  const auth = await getAuthenticatedGymId();
  if (!auth) return [];

  // Messages addressed specifically to this gym or broadcast to all gyms (gymId is null)
  const messages = await prisma.adminMessage.findMany({
    where: {
      OR: [
        { gymId: auth.gymId },
        { gymId: null },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  return messages.map((m) => ({
    id: m.id,
    title: m.title,
    message: m.message,
    priority: m.priority,
    isRead: m.isRead,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function markAdminMessageAsRead(messageId: string) {
  const auth = await getAuthenticatedGymId();
  if (!auth) return { ok: false };

  try {
    await prisma.adminMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    });
    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    return { ok: false };
  }
}
