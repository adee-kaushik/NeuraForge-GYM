import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

async function hasAuthCookie(): Promise<boolean> {
  const store = await cookies();
  return store.getAll().some((c) => c.name.includes('-auth-token'));
}

// The id of the logged-in Supabase user, or null.
// getClaims() checks the login token on our own server (using Supabase's public signing keys),
// so it does not make a network call to Supabase on every request like getUser() does.
// cache() makes the page, the layout and any helper share one check per request.
const getAuthUserId = cache(async (): Promise<string | null> => {
  if (!(await hasAuthCookie())) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === 'string' ? sub : null;
});

// Returns the logged-in owner/staff user (with their gym), or null.
// A removed staff member has no User row, so they lose access immediately even if their token is still valid.
export const getCurrentStaff = cache(async () => {
  const authUserId = await getAuthUserId();
  if (!authUserId) return null;

  return prisma.user.findUnique({
    where: { authUserId },
    include: { gym: true },
  });
});

// For server actions: the logged-in owner/staff, or an error.
export async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not logged in');
  return staff;
}

// Returns the logged-in member (with their gym), or null. Owners and staff get null here.
export const getCurrentMember = cache(async () => {
  const authUserId = await getAuthUserId();
  if (!authUserId) return null;

  return prisma.member.findUnique({
    where: { authUserId },
    include: { gym: true },
  });
});
