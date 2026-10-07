import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

async function hasAuthCookie(): Promise<boolean> {
  const store = await cookies();
  return store.getAll().some((c) => c.name.includes('-auth-token'));
}

// Returns the logged-in owner/staff user (with their gym), or null.
// Fast check prevents blocking remote Supabase requests when unauthenticated.
export async function getCurrentStaff() {
  if (!(await hasAuthCookie())) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return prisma.user.findUnique({
    where: { authUserId: data.user.id },
    include: { gym: true },
  });
}

// For server actions: the logged-in owner/staff, or an error.
export async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not logged in');
  return staff;
}

// Returns the logged-in member (with their gym), or null. Owners and staff get null here.
export async function getCurrentMember() {
  if (!(await hasAuthCookie())) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return prisma.member.findUnique({
    where: { authUserId: data.user.id },
    include: { gym: true },
  });
}
