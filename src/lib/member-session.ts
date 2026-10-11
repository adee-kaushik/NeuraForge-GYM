import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const MEMBER_COOKIE_NAME = 'nf_member_session';
const SESSION_SECRET =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  'neuraforge-secure-member-session-key-2026';

function signToken(memberId: string): string {
  const hmac = createHmac('sha256', SESSION_SECRET).update(`member-session:${memberId}`).digest('hex');
  return `${memberId}.${hmac}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [memberId, providedHmac] = parts;
  const expectedHmac = createHmac('sha256', SESSION_SECRET).update(`member-session:${memberId}`).digest('hex');
  if (providedHmac.length !== expectedHmac.length) return null;
  const match = timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac));
  return match ? memberId : null;
}

export async function setMemberSession(memberId: string): Promise<void> {
  const store = await cookies();
  const token = signToken(memberId);
  store.set(MEMBER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

export async function clearMemberSession(): Promise<void> {
  const store = await cookies();
  store.delete(MEMBER_COOKIE_NAME);
}

export async function getMemberSessionId(): Promise<string | null> {
  const store = await cookies();
  const cookie = store.get(MEMBER_COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifyToken(cookie.value);
}
