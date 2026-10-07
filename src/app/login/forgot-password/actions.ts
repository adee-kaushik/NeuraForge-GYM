'use server';

import { createClient } from '@/utils/supabase/server';

export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
  if (!email) return { error: 'Enter your email address.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ''}/login`,
  });

  // Don't reveal whether the email exists (security best practice)
  if (error) {
    console.error('Password reset error:', error.message);
  }

  return {};
}
