'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { memberEmail } from '@/lib/member-auth';
import { startOfDayIST } from '@/lib/format';

export type MemberLoginState = { error?: string };

export async function loginMember(_prev: MemberLoginState, formData: FormData): Promise<MemberLoginState> {
  const gymCode = String(formData.get('gymCode') ?? '').trim().toLowerCase();
  const memberCode = String(formData.get('memberCode') ?? '').trim().toUpperCase();
  const password = String(formData.get('password') ?? '');

  if (!gymCode || !memberCode || !password) return { error: 'Enter your gym code, member ID and password.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: memberEmail(gymCode, memberCode),
    password,
  });
  if (error || !data.user) return { error: 'Wrong gym code, member ID or password.' };

  // Only member accounts may use this page (owners and staff log in on /login)
  const member = await prisma.member.findUnique({ where: { authUserId: data.user.id } });
  if (!member) {
    await supabase.auth.signOut();
    return { error: 'This is not a member account.' };
  }

  redirect('/member');
}

export async function logoutMember() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/member/login');
}

export async function memberSelfCheckIn(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Please log in first.' };

  const member = await prisma.member.findUnique({
    where: { authUserId: user.id },
  });
  if (!member) return { ok: false, error: 'Member not found.' };

  const now = new Date();
  const latestMembership = await prisma.membership.findFirst({
    where: { memberId: member.id, gymId: member.gymId },
    orderBy: { expiresAt: 'desc' },
  });

  if (!latestMembership || latestMembership.expiresAt < now) {
    return { ok: false, error: 'Your membership has expired. Please renew with the front desk.' };
  }

  const alreadyIn = await prisma.attendance.findFirst({
    where: {
      gymId: member.gymId,
      memberId: member.id,
      checkedInAt: { gte: startOfDayIST(now) },
    },
  });

  if (alreadyIn) {
    return { ok: false, error: 'You have already checked in today.' };
  }

  await prisma.attendance.create({
    data: {
      gymId: member.gymId,
      memberId: member.id,
      checkedInAt: now,
    },
  });

  return { ok: true };
}
