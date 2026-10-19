'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/utils/supabase/admin';
import { startOfDayIST } from '@/lib/format';
import { clearMemberSession } from '@/lib/member-session';
import { getCurrentMember } from '@/lib/auth';
import { membershipActiveAt } from '@/lib/biometric';
import { ensureDatabaseSchema } from '@/lib/db-init';

export type MemberLoginState = { error?: string; success?: boolean };

export async function loginMember(_prev: MemberLoginState, formData: FormData): Promise<MemberLoginState> {
  const gymCode = String(formData.get('gymCode') ?? '').trim().toLowerCase();
  const memberCode = String(formData.get('memberCode') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const invalid = { error: 'Invalid gym code, member ID or password. Ask reception for your login details.' };
  if (!gymCode || !memberCode || !password || gymCode.length > 50 || memberCode.length > 80 || password.length > 256) return invalid;
  try {
    const member = await prisma.member.findFirst({
      where: { gym: { slug: gymCode }, memberCode: { equals: memberCode, mode: 'insensitive' } },
      select: { authUserId: true },
    });
    if (!member?.authUserId) return invalid;
    // Read the existing auth email so gym-code changes do not break established logins.
    const admin = createAdminClient();
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(member.authUserId);
    if (accountError || !account.user?.email) return invalid;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: account.user.email, password });
    if (error || data.user?.id !== member.authUserId) return invalid;
    await clearMemberSession();
    return { success: true };
  } catch (error) {
    console.error('Member login failed:', error);
    return { error: 'Unable to sign in right now. Please try again.' };
  }
}

export async function updateMemberProfilePhoto(photoUrl: string): Promise<{ ok: boolean; error?: string }> {
  const member = await getCurrentMember();
  if (!member) return { ok: false, error: 'Please log in first.' };

  try {
    await prisma.member.update({
      where: { id: member.id },
      data: { photoUrl },
    });
    return { ok: true };
  } catch {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Member" SET "photoUrl" = $1 WHERE id = $2`,
        photoUrl,
        member.id
      );
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Could not update profile photo.' };
    }
  }
}

export type ResetPasswordResult = {
  ok: boolean;
  error?: string;
  phone?: string;
  memberName?: string;
  gymName?: string;
  gymCode?: string;
  password?: string;
  whatsappUrl?: string;
  smsUrl?: string;
  messageText?: string;
};

// Phone numbers and gym codes do not prove identity. Recovery is handled by authenticated staff.
export async function resetMemberPasswordByPhone(_gymCode: string, _phoneOrId: string): Promise<ResetPasswordResult> {
  return { ok: false, error: 'Please contact your gym reception to reset your member password.' };
}

export async function logoutMember() {
  await clearMemberSession();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/member/login');
}

export async function memberSelfCheckIn(): Promise<{ ok: boolean; error?: string }> {
  const member = await getCurrentMember();
  if (!member) return { ok: false, error: 'Please log in first.' };

  // A gym that takes attendance on a biometric machine must not also let members tap "check in" from home.
  const gymRow = await prisma.gym.findUnique({ where: { id: member.gymId }, select: { attendanceMode: true } }).catch(() => null);
  if (gymRow?.attendanceMode === 'BIOMETRIC') {
    return { ok: false, error: 'This gym marks attendance on its biometric machine. Please scan your finger or face at the entrance.' };
  }

  const now = new Date();
  const latestMembership = await prisma.membership.findFirst({
    where: { memberId: member.id, gymId: member.gymId },
    orderBy: { expiresAt: 'desc' },
  });

  if (!latestMembership || !membershipActiveAt(latestMembership.expiresAt, now)) {
    return { ok: false, error: '🚫 ACCESS DENIED: Your membership has expired. Please renew with the front desk.' };
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

export type SubmitQueryResult = { ok: boolean; error?: string };

export async function submitMemberQuery(
  categoryRaw: string,
  subjectRaw: string,
  messageRaw: string
): Promise<SubmitQueryResult> {
  const member = await getCurrentMember();
  if (!member) return { ok: false, error: 'Please log in to submit a query.' };

  const category = categoryRaw.trim().toUpperCase();
  const subject = subjectRaw.trim();
  const message = messageRaw.trim();

  if (!subject) return { ok: false, error: 'Please provide a subject.' };
  if (!message) return { ok: false, error: 'Please enter details for your query.' };

  const validCategories = ['WORKOUT_PLAN', 'MACHINE_MALFUNCTION', 'TIMINGS', 'BILLING', 'OTHER'];
  const effectiveCategory = validCategories.includes(category) ? category : 'OTHER';

  await prisma.memberQuery.create({
    data: {
      gymId: member.gymId,
      memberId: member.id,
      category: effectiveCategory,
      subject,
      message,
      status: 'PENDING',
    },
  });

  return { ok: true };
}
