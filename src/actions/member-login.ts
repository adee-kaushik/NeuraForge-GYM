'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePassword, memberEmail } from '@/lib/member-auth';

export type MemberLoginResult =
  | { ok: true; gymCode: string; memberCode: string; password?: string }
  | { ok: false; error: string };

export async function createMemberLogin(memberId: string): Promise<MemberLoginResult> {
  const staff = await requireStaff();
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: staff.gymId } });
  if (!member) return { ok: false, error: 'Member not found.' };
  if (member.authUserId) return { ok: false, error: 'Login already exists. Use Reset Password.' };
  const password = generatePassword(16);
  const admin = createAdminClient();
  // Internal stable IDs avoid collisions from shared phones or punctuation in member codes.
  const { data, error } = await admin.auth.admin.createUser({
    email: memberEmail(staff.gymId, member.id), password, email_confirm: true,
    app_metadata: { role: 'MEMBER', gym_id: staff.gymId, member_id: member.id },
  });
  if (error || !data.user) return { ok: false, error: 'Could not create member login. Please try again.' };
  try {
    const linked = await prisma.member.updateMany({
      where: { id: member.id, gymId: staff.gymId, authUserId: null }, data: { authUserId: data.user.id },
    });
    if (linked.count !== 1) throw new Error('Login already linked');
  } catch {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: 'Could not link member login. Please refresh and try again.' };
  }
  return { ok: true, gymCode: staff.gym.slug, memberCode: member.memberCode, password };
}

export async function resetMemberPassword(memberId: string): Promise<MemberLoginResult> {
  const staff = await requireStaff();
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: staff.gymId } });
  if (!member?.authUserId) return { ok: false, error: 'Create a member login first.' };
  const password = generatePassword(16);
  const { error } = await createAdminClient().auth.admin.updateUserById(member.authUserId, { password });
  if (error) return { ok: false, error: 'Could not reset the password. Please try again.' };
  return { ok: true, gymCode: staff.gym.slug, memberCode: member.memberCode, password };
}

export async function revokeMemberLogin(memberId: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: staff.gymId } });
  if (!member) return { ok: false, error: 'Member not found.' };
  if (!member.authUserId) return { ok: true };
  const { error } = await createAdminClient().auth.admin.deleteUser(member.authUserId);
  if (error) return { ok: false, error: 'Could not revoke login. Please try again.' };
  await prisma.member.updateMany({ where: { id: member.id, gymId: staff.gymId, authUserId: member.authUserId }, data: { authUserId: null } });
  return { ok: true };
}
