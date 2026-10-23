'use server';

import { siteOrigin } from '@/lib/site-url';
import { createClient } from '@/utils/supabase/server';
import { MEMBER_EMAIL_DOMAIN } from '@/lib/member-auth';

// Sends a password reset email. The link inside the email opens /auth/confirm,
// which establishes the session and navigates to /login/reset-password.
export async function requestPasswordReset(email: string, clientOrigin?: string): Promise<{ error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { error: 'Enter your email address.' };

  // Member logins use made-up addresses that cannot receive mail. Members ask their gym to reset.
  if (clean.endsWith(`@${MEMBER_EMAIL_DOMAIN}`)) return {};

  const supabase = await createClient();

  let base = siteOrigin();
  if (clientOrigin && (clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1'))) {
    base = clientOrigin;
  }

  const redirectTo = `${base}/auth/confirm`;

  const { error } = await supabase.auth.resetPasswordForEmail(clean, {
    redirectTo,
  });

  // Never reveal whether the email has an account
  if (error) console.error('Password reset error:', error.message);

  return {};
}
