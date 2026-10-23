'use server';

import { createClient } from '@/utils/supabase/server';

export type ResetState = { error?: string; done?: boolean };

export async function updatePassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const accessToken = String(formData.get('accessToken') ?? '').trim();

  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (password !== confirm) return { error: 'The two passwords do not match.' };

  const supabase = await createClient();

  // 1. Check server session from cookies
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const same = error.message.toLowerCase().includes('different');
      return { error: same ? 'Choose a password you have not used before.' : (error.message || 'Could not update the password. Please try again.') };
    }
    await supabase.auth.signOut().catch(() => {});
    return { done: true };
  }

  // 2. If cookie session was not found but client verified an access token from hash fragment
  if (accessToken) {
    try {
      const { data: tokenData, error: tokenError } = await supabase.auth.getUser(accessToken);
      if (tokenData?.user && !tokenError) {
        const { createAdminClient } = await import('@/utils/supabase/admin');
        const admin = createAdminClient();
        const { error: adminError } = await admin.auth.admin.updateUserById(tokenData.user.id, {
          password,
          email_confirm: true,
        });
        if (adminError) {
          const same = adminError.message.toLowerCase().includes('different');
          return { error: same ? 'Choose a password you have not used before.' : (adminError.message || 'Could not update password.') };
        }
        return { done: true };
      }
    } catch (e) {
      console.error('Token-based password update exception:', e);
    }
  }

  return { error: 'This reset link has expired or is invalid. Please request a new one.' };
}
