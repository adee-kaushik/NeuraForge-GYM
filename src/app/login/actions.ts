'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { hasAdminAccess } from '@/lib/admin-policy';
import { clearMemberSession } from '@/lib/member-session';
import { cookies } from 'next/headers';

export type LoginState = { error?: string; success?: boolean };

export async function loginOwner(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const rawPassword = String(formData.get('password') ?? '');
  const trimmedPassword = rawPassword.trim();

  if (!email || !rawPassword) return { error: 'Enter your email and password.' };

  const supabase = await createClient();

  // 1. Try signing in with the provided password
  let { data, error } = await supabase.auth.signInWithPassword({ email, password: rawPassword });

  // 2. If it failed and password had leading/trailing spaces (e.g. copied from message), try trimmed
  if ((error || !data.user) && rawPassword !== trimmedPassword) {
    const retry = await supabase.auth.signInWithPassword({ email, password: trimmedPassword });
    if (!retry.error && retry.data.user) {
      data = retry.data;
      error = null;
    }
  }

  // 3. Handle unconfirmed email automatically for registered gym users
  if (error && error.message?.toLowerCase().includes('not confirmed')) {
    try {
      const { createAdminClient } = await import('@/utils/supabase/admin');
      const admin = createAdminClient();
      const userRecord = await prisma.user.findUnique({ where: { email } });
      if (userRecord) {
        if (userRecord.authUserId) {
          await admin.auth.admin.updateUserById(userRecord.authUserId, { email_confirm: true });
        } else {
          const { data: userList } = await admin.auth.admin.listUsers();
          const authUser = (userList?.users as any[])?.find((u: any) => u.email?.toLowerCase() === email);
          if (authUser) {
            await admin.auth.admin.updateUserById(authUser.id, { email_confirm: true });
          }
        }
        // Retry sign-in now that email is confirmed
        const retryAfterConfirm = await supabase.auth.signInWithPassword({
          email,
          password: rawPassword,
        });
        if (!retryAfterConfirm.error && retryAfterConfirm.data.user) {
          data = retryAfterConfirm.data;
          error = null;
        } else if (rawPassword !== trimmedPassword) {
          const retryTrimmed = await supabase.auth.signInWithPassword({
            email,
            password: trimmedPassword,
          });
          if (!retryTrimmed.error && retryTrimmed.data.user) {
            data = retryTrimmed.data;
            error = null;
          }
        }
      }
    } catch (confirmErr) {
      console.warn('Auto-confirm attempt notice:', confirmErr);
    }
  }

  if (error || !data.user) {
    console.warn(`Login failed for ${email}:`, error?.message);
    if (error?.status === 429 || error?.message?.toLowerCase().includes('rate limit') || error?.message?.toLowerCase().includes('too many')) {
      return { error: 'Too many attempts. Please wait a minute and try again.' };
    }
    if (error?.message?.toLowerCase().includes('not confirmed')) {
      return { error: 'Your email address has not been confirmed yet. Please check your inbox or contact support.' };
    }
    return { error: 'Wrong email or password.' };
  }

  // Only owner/staff accounts may use this dashboard (members are handled separately)
  let staff = await prisma.user.findUnique({ where: { authUserId: data.user.id } });
  if (!staff) {
    // If not found by authUserId, self-heal the link if email matches
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      staff = await prisma.user.update({
        where: { email },
        data: { authUserId: data.user.id },
      });
    }
  }

  if (!staff) {
    await supabase.auth.signOut();
    return { error: 'This account is not an owner or staff account.' };
  }

  if (typeof clearMemberSession === 'function') {
    await clearMemberSession().catch(() => {});
  }
  return { success: true };
}

export async function loginAdmin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const rawPassword = String(formData.get('password') ?? '');
  const trimmedPassword = rawPassword.trim();

  if (!email || !rawPassword) return { error: 'Enter your admin email and password.' };

  const supabase = await createClient();
  let { data, error } = await supabase.auth.signInWithPassword({ email, password: rawPassword });

  if ((error || !data.user) && rawPassword !== trimmedPassword) {
    const retry = await supabase.auth.signInWithPassword({ email, password: trimmedPassword });
    if (!retry.error && retry.data.user) {
      data = retry.data;
      error = null;
    }
  }

  if (error || !data.user) {
    console.warn(`Admin login failed for ${email}:`, error?.message);
    if (error?.status === 429 || error?.message?.toLowerCase().includes('rate limit')) {
      return { error: 'Too many attempts. Please wait a minute and try again.' };
    }
    return { error: 'Wrong admin email or password.' };
  }

  const isAdmin = hasAdminAccess(data.user);

  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: 'Access denied: This account does not have superadmin clearance.' };
  }

  if (typeof clearMemberSession === 'function') {
    await clearMemberSession().catch(() => {});
  }
  return { success: true };
}

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