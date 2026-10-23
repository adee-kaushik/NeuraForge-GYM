import { NextResponse, type NextRequest } from 'next/server';
import { siteOrigin } from '@/lib/site-url';
import { createClient } from '@/utils/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';

// The link in the password reset email opens here.
// Handles PKCE codes, token_hash/token params, and preserves hash fragments for client processing.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash') || request.nextUrl.searchParams.get('token');
  const typeParam = request.nextUrl.searchParams.get('type');
  const type = (typeParam || 'recovery') as EmailOtpType;
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') || '/login/reset-password';

  let origin = siteOrigin();
  const reqOrigin = request.nextUrl.origin;
  if (reqOrigin && (reqOrigin.includes('localhost') || reqOrigin.includes('127.0.0.1'))) {
    origin = reqOrigin;
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error('exchangeCodeForSession error in /auth/confirm:', error.message);
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error('verifyOtp error in /auth/confirm:', error.message);
  }

  // When Supabase uses implicit grant, the token is in the URL hash fragment (#access_token=...).
  // Browsers never send hash fragments to server route handlers.
  // Redirect to /login/reset-password so the browser client can read the hash fragment!
  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL('/login/reset-password', origin));
  }

  return NextResponse.redirect(new URL('/login/forgot-password?expired=1', origin));
}
