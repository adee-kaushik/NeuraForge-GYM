import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// The link in the password reset email opens here. It works on any device or browser
// (the person may open the email on their phone), because it only needs the token in the link.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  const code = request.nextUrl.searchParams.get('code');

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  let origin = host ? `${proto}://${host}` : request.nextUrl.origin;
  if (!origin || (process.env.NODE_ENV === 'production' && origin.includes('localhost'))) {
    origin = 'https://neurafitness.vercel.app';
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL('/login/reset-password', origin));
    }
  }

  if (tokenHash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL('/login/reset-password', origin));
    }
  }

  return NextResponse.redirect(new URL('/login/forgot-password?expired=1', origin));
}

