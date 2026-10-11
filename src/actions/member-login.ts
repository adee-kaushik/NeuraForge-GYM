'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePassword, memberEmail } from '@/lib/member-auth';

export type MemberLoginResult =
  | { ok: true; gymCode: string; memberCode: string; password?: string }
  | { ok: false; error: string };

// Creates or fetches the app login for one of this gym's members (passwordless)
export async function createMemberLogin(memberId: string): Promise<MemberLoginResult> {
  const staff = await requireStaff();

  // gymId in the query means a member of another gym can never be found here
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: staff.gymId } });
  if (!member) return { ok: false, error: 'Member not found.' };

  const cleanPhone = member.phone.replace(/\D/g, '').slice(-10);
  const loginIdentifier = cleanPhone || member.memberCode;

  if (!member.authUserId) {
    const password = generatePassword();
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.createUser({
      email: memberEmail(staff.gym.slug, loginIdentifier),
      password,
      email_confirm: true,
      app_metadata: { role: 'MEMBER', gym_id: staff.gymId, member_id: member.id },
    });
    if (data?.user) {
      await prisma.member.update({ where: { id: member.id }, data: { authUserId: data.user.id } });
    }
  }

  return { ok: true, gymCode: staff.gym.slug, memberCode: member.phone };
}

// Resends login credentials / pass info (no password required)
export async function resetMemberPassword(memberId: string): Promise<MemberLoginResult> {
  const staff = await requireStaff();

  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: staff.gymId } });
  if (!member) return { ok: false, error: 'Member not found.' };

  return { ok: true, gymCode: staff.gym.slug, memberCode: member.phone };
}

// Revokes the app login for a member (e.g. member has left the gym or cancelled)
export async function revokeMemberLogin(memberId: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();

  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: staff.gymId } });
  if (!member) return { ok: false, error: 'Member not found.' };
  if (!member.authUserId) return { ok: true };

  const admin = createAdminClient();
  try {
    await admin.auth.admin.deleteUser(member.authUserId);
  } catch (err) {
    console.warn('Could not delete auth user from Supabase admin:', err);
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { authUserId: null },
  });

  return { ok: true };
}

