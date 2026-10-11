'use server';

import { createClient } from '@/utils/supabase/server';
import { MEMBER_EMAIL_DOMAIN } from '@/lib/member-auth';

// Sends a password reset email. The link inside the email is built by the "Reset Password" email
// template in Supabase and opens /auth/confirm, which signs the person in and sends them to
// /login/reset-password.
export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { error: 'Enter your email address.' };

  // Member logins use made-up addresses that cannot receive mail. Members ask their gym to reset.
  if (clean.endsWith(`@${MEMBER_EMAIL_DOMAIN}`)) return {};

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(clean);

  // Never reveal whether the email has an account
  if (error) console.error('Password reset error:', error.message);

  return {};
}
