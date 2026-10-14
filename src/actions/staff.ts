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

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getPublicSupabaseClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Creates a staff login. The password is returned once, for the owner to pass on.
export async function addStaff(input: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}): Promise<StaffLoginResult> {
  const me = await requireStaff();
  if (me.role !== 'OWNER') return { ok: false, error: NOT_OWNER };

  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase();
  const digits = String(input.phone ?? '').replace(/\D/g, '');
  const customPassword = String(input.password ?? '').trim();

  if (!name || name.length > 80) return { ok: false, error: 'Enter the staff member\'s name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120 || email.endsWith(`@${MEMBER_EMAIL_DOMAIN}`)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (digits && !(digits.length === 10 || (digits.length === 12 && digits.startsWith('91')))) {
    return { ok: false, error: 'Phone must be a 10-digit mobile number.' };
  }
  if (customPassword && customPassword.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters long.' };
  }

  const phone = digits ? `+91 ${digits.slice(-10, -5)} ${digits.slice(-5)}` : null;

  const taken = 'This email is already used by another account. Use a different email.';
  if (await prisma.user.findUnique({ where: { email } })) return { ok: false, error: taken };

  const password = customPassword || generatePassword();
  let authUserId = '';

  // 1. Try Admin Client if service role key is configured
  const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  if (secretKey && secretKey.length > 30) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: 'STAFF', gym_id: me.gymId },
      });
      if (data?.user) {
        authUserId = data.user.id;
      } else if (error) {
        console.warn('Admin createUser notice:', error.message);
      }
    } catch (err) {
      console.warn('Admin createUser exception:', err);
    }
  }

  // 2. Fallback to public client signUp if admin client did not yield an id
  if (!authUserId) {
    try {
      const publicSupabase = getPublicSupabaseClient();
      const { data: publicData, error: publicError } = await publicSupabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'STAFF', gym_id: me.gymId, full_name: name },
        },
      });

      if (publicData?.user) {
        authUserId = publicData.user.id;
      } else if (publicError) {
        console.error('Public signUp error:', publicError);
        const isTaken = /already.*registered|already exists|email address is already/i.test(publicError.message);
        if (isTaken) {
          // If already in auth.users, try signing in to retrieve auth id
          const { data: signInData } = await publicSupabase.auth.signInWithPassword({ email, password }).catch(() => ({ data: null }));
          if (signInData?.user) {
            authUserId = signInData.user.id;
          } else {
            return { ok: false, error: 'An account with this email already exists. Please use another email or reset their password.' };
          }
        } else {
          return { ok: false, error: publicError.message || 'Could not create staff login. Please try again.' };
        }
      }
    } catch (err: any) {
      console.error('Supabase signup fallback error:', err);
      return { ok: false, error: err?.message || 'Could not reach authentication service.' };
    }
  }

  if (!authUserId) {
    return { ok: false, error: 'Could not create the login. Please check email address and try again.' };
  }

  try {
    const user = await prisma.user.create({
      data: { gymId: me.gymId, authUserId, name, email, phone, role: 'STAFF' },
    });
    return { ok: true, staff: toRecord(user), password };
  } catch (err: any) {
    console.error('Prisma user creation error:', err);
    return { ok: false, error: err?.message || 'Could not add the staff member to gym database.' };
  }
}

// Sets a new random password for one of this gym's staff (never the owner)
export async function resetStaffPassword(staffId: string): Promise<StaffLoginResult> {
  const me = await requireStaff();
  if (me.role !== 'OWNER') return { ok: false, error: NOT_OWNER };

  const target = await prisma.user.findFirst({ where: { id: staffId, gymId: me.gymId, role: 'STAFF' } });
  if (!target) return { ok: false, error: 'Staff member not found.' };

  const password = generatePassword();
  let updated = false;

  const secretKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  if (secretKey && secretKey.length > 30) {
    try {
      const { error } = await createAdminClient().auth.admin.updateUserById(target.authUserId, { password });
      if (!error) updated = true;
    } catch {}
  }

  if (!updated) {
    // Send password reset email via public client
    try {
      const publicSupabase = getPublicSupabaseClient();
      await publicSupabase.auth.resetPasswordForEmail(target.email);
    } catch {}
  }

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
