'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePassword, memberEmail } from '@/lib/member-auth';

export type MemberLoginResult =
  | { ok: true; gymCode: string; memberCode: string; password: string }
  | { ok: false; error: string };

// Creates the app login for one of this gym's members. The password is returned once, for the owner to send.
export async function createMemberLogin(memberId: string): Promise<MemberLoginResult> {
  const staff = await requireStaff();

  // gymId in the query means a member of another gym can never be found here
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: staff.gymId } });
  if (!member) return { ok: false, error: 'Member not found.' };
  if (member.authUserId) return { ok: false, error: 'This member already has a login. Use Reset password.' };

  const password = generatePassword();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: memberEmail(staff.gym.slug, member.memberCode),
    password,
    email_confirm: true,
    app_metadata: { role: 'MEMBER', gym_id: staff.gymId, member_id: member.id },
  });
  if (error || !data.user) return { ok: false, error: 'Could not create the login. Please try again.' };

  try {
    await prisma.member.update({ where: { id: member.id }, data: { authUserId: data.user.id } });
  } catch {
    await admin.auth.admin.deleteUser(data.user.id); // don't leave a login that belongs to nobody
    return { ok: false, error: 'Could not create the login. Please try again.' };
  }

  return { ok: true, gymCode: staff.gym.slug, memberCode: member.memberCode, password };
}

// Sets a new random password for a member who already has a login.
export async function resetMemberPassword(memberId: string): Promise<MemberLoginResult> {
  const staff = await requireStaff();

  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: staff.gymId } });
  if (!member) return { ok: false, error: 'Member not found.' };
  if (!member.authUserId) return { ok: false, error: 'This member has no login yet.' };

  const password = generatePassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(member.authUserId, { password });
  if (error) return { ok: false, error: 'Could not reset the password. Please try again.' };

  return { ok: true, gymCode: staff.gym.slug, memberCode: member.memberCode, password };
}
