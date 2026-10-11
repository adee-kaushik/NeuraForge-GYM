import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// The link in the password reset email opens here. It works on any device or browser
// (the person may open the email on their phone), because it only needs the token in the link.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');

  const target = request.nextUrl.clone();
  target.search = '';

  if (tokenHash && type === 'recovery') {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
    if (!error) {
      target.pathname = '/login/reset-password';
      return NextResponse.redirect(target);
    }
  }

  target.pathname = '/login/forgot-password';
  target.search = '?expired=1';
  return NextResponse.redirect(target);
}
