'use server';

import { createClient } from '@/utils/supabase/server';

export type ResetState = { error?: string; done?: boolean };

export async function updatePassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (password !== confirm) return { error: 'The two passwords do not match.' };

  const supabase = await createClient();

  // Only someone who opened a valid reset link has a session here
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: 'This reset link has expired. Please request a new one.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const same = error.message.toLowerCase().includes('different');
    return { error: same ? 'Choose a password you have not used before.' : 'Could not update the password. Please try again.' };
  }

  // Make them log in with the new password
  await supabase.auth.signOut();
  return { done: true };
}
