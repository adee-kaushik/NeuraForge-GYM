import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'nf_member_pass_v1';
const MAX_AGE = 60 * 60 * 24;
function sign(payload: string) {
  const key = (process.env.MEMBER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  if (!key) throw new Error('Member session signing is not configured');
  return createHmac('sha256', key).update('member-pass-v1:' + payload).digest('base64url');
}

export async function setMemberSession(memberId: string, gymId: string): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ memberId, gymId, expiresAt: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  const value = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.delete('nf_member_session');
  store.set(COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: MAX_AGE });
}

export async function getMemberSession(): Promise<{ memberId: string; gymId: string } | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value || value.length > 2048) return null;
  try {
    const [payload, signature, extra] = value.split('.');
    if (!payload || !signature || extra !== undefined) return null;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof data.memberId !== 'string' || !data.memberId || typeof data.gymId !== 'string' || !data.gymId || typeof data.expiresAt !== 'number' || data.expiresAt <= Date.now()) return null;
    return { memberId: data.memberId, gymId: data.gymId };
  } catch { return null; }
}

// Clear both the new signed pass and the retired phone-only cookie.
export async function clearMemberSession(): Promise<void> {
  const store = await cookies();
  store.delete('nf_member_session');
  store.delete(COOKIE);
}
