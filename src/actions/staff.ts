'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePassword, MEMBER_EMAIL_DOMAIN } from '@/lib/member-auth';
import type { StaffRecord } from '@/types';

export type StaffListResult = { ok: true; staff: StaffRecord[] } | { ok: false; error: string };
export type StaffLoginResult =
  | { ok: true; staff: StaffRecord; password: string }
  | { ok: false; error: string };

const NOT_OWNER = 'Only the gym owner can manage staff.';
const toRecord = (u: { id: string; name: string; email: string; phone: string | null; role: 'OWNER' | 'STAFF' }): StaffRecord => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
});

// The owner's own gym only: gymId always comes from the logged-in session
export async function listStaff(): Promise<StaffListResult> {
  const me = await requireStaff();
  if (me.role !== 'OWNER') return { ok: false, error: NOT_OWNER };

  const users = await prisma.user.findMany({ where: { gymId: me.gymId }, orderBy: [{ role: 'asc' }, { createdAt: 'asc' }] });
  return { ok: true, staff: users.map(toRecord) };
}

// Creates a staff login. The password is returned once, for the owner to pass on.
export async function addStaff(input: { name: string; email: string; phone?: string }): Promise<StaffLoginResult> {
  const me = await requireStaff();
  if (me.role !== 'OWNER') return { ok: false, error: NOT_OWNER };

  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase();
  const digits = String(input.phone ?? '').replace(/\D/g, '');

  if (!name || name.length > 80) return { ok: false, error: 'Enter the staff member\'s name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120 || email.endsWith(`@${MEMBER_EMAIL_DOMAIN}`)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (digits && !(digits.length === 10 || (digits.length === 12 && digits.startsWith('91')))) {
    return { ok: false, error: 'Phone must be a 10-digit mobile number.' };
  }
  const phone = digits ? `+91 ${digits.slice(-10, -5)} ${digits.slice(-5)}` : null;

  const taken = 'This email is already used by another account. Use a different email.';
  if (await prisma.user.findUnique({ where: { email } })) return { ok: false, error: taken };

  const password = generatePassword();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'STAFF', gym_id: me.gymId },
  });
  if (error || !data.user) {
    const exists = error?.code === 'email_exists' || /already.*registered|already been registered/i.test(error?.message ?? '');
    return { ok: false, error: exists ? taken : 'Could not create the login. Please try again.' };
  }

  try {
    const user = await prisma.user.create({
      data: { gymId: me.gymId, authUserId: data.user.id, name, email, phone, role: 'STAFF' },
    });
    return { ok: true, staff: toRecord(user), password };
  } catch {
    await admin.auth.admin.deleteUser(data.user.id); // don't leave a login that belongs to nobody
    return { ok: false, error: 'Could not add the staff member. Please try again.' };
  }
}

// Sets a new random password for one of this gym's staff (never the owner)
export async function resetStaffPassword(staffId: string): Promise<StaffLoginResult> {
  const me = await requireStaff();
  if (me.role !== 'OWNER') return { ok: false, error: NOT_OWNER };

  const target = await prisma.user.findFirst({ where: { id: staffId, gymId: me.gymId, role: 'STAFF' } });
  if (!target) return { ok: false, error: 'Staff member not found.' };

  const password = generatePassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(target.authUserId, { password });
  if (error) return { ok: false, error: 'Could not reset the password. Please try again.' };

  return { ok: true, staff: toRecord(target), password };
}

// Removes a staff member's access straight away
export async function removeStaff(staffId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireStaff();
  if (me.role !== 'OWNER') return { ok: false, error: NOT_OWNER };

  const target = await prisma.user.findFirst({ where: { id: staffId, gymId: me.gymId, role: 'STAFF' } });
  if (!target) return { ok: false, error: 'Staff member not found.' };

  // Without a User row they can no longer open the dashboard, even if the login clean-up below fails
  await prisma.user.delete({ where: { id: target.id } });
  await createAdminClient().auth.admin.deleteUser(target.authUserId);

  return { ok: true };
}
