'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { hasAdminAccess } from '@/lib/admin-policy';
import { clearMemberSession } from '@/lib/member-session';

export type LoginState = { error?: string; success?: boolean };

export async function loginOwner(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'Wrong email or password.' };

  // Only owner/staff accounts may use this dashboard (members are handled separately)
  const staff = await prisma.user.findUnique({ where: { authUserId: data.user.id } });
  if (!staff) {
    await supabase.auth.signOut();
    return { error: 'This account is not an owner or staff account.' };
  }

  return { success: true };
}

export async function loginAdmin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Enter your admin email and password.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'Wrong admin email or password.' };

  const isAdmin = hasAdminAccess(data.user);

  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: 'Access denied: This account does not have superadmin clearance.' };
  }

  return { success: true };
}

import { cookies } from 'next/headers';

export async function logout() {
  try {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.includes('-auth-token') || cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
        cookieStore.delete(cookie.name);
      }
    }
  } catch (err) {
    console.error('Logout cookie clear error:', err);
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {}

  await clearMemberSession();
  redirect('/login');
}