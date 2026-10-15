'use server';

import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { MEMBER_EMAIL_DOMAIN } from '@/lib/member-auth';

// Sends a password reset email. The link inside the email is built by the "Reset Password" email
// template in Supabase and opens /auth/confirm, which signs the person in and sends them to
// /login/reset-password.
export async function requestPasswordReset(email: string, clientOrigin?: string): Promise<{ error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { error: 'Enter your email address.' };

  // Member logins use made-up addresses that cannot receive mail. Members ask their gym to reset.
  if (clean.endsWith(`@${MEMBER_EMAIL_DOMAIN}`)) return {};

  const supabase = await createClient();

  // Dynamically resolve site origin so Supabase email link redirects to the deployed site instead of localhost:3000
  let siteUrl = clientOrigin?.trim();

  if (!siteUrl || siteUrl.includes('localhost')) {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) {
      siteUrl = envUrl;
    } else if (process.env.VERCEL_URL) {
      siteUrl = `https://${process.env.VERCEL_URL}`;
    }
  }

  if (!siteUrl || siteUrl.includes('localhost')) {
    try {
      const headerList = await headers();
      const host = headerList.get('x-forwarded-host') || headerList.get('host');
      const proto = headerList.get('x-forwarded-proto') || (host && host.includes('localhost') ? 'http' : 'https');
      if (host && !host.includes('localhost')) {
        siteUrl = `${proto}://${host}`;
      }
    } catch {
      // Fallback if headers cannot be read
    }
  }

  // If still empty or localhost in production, fallback to live deployment
  if (!siteUrl || (process.env.NODE_ENV === 'production' && siteUrl.includes('localhost'))) {
    siteUrl = 'https://neurafitness.vercel.app';
  }

  // Ensure no trailing slash
  siteUrl = siteUrl.replace(/\/+$/, '');

  const redirectTo = `${siteUrl}/auth/confirm`;

  const { error } = await supabase.auth.resetPasswordForEmail(clean, {
    redirectTo,
  });

  // Never reveal whether the email has an account
  if (error) console.error('Password reset error:', error.message);

  return {};
}

