import { subscriptionActive } from '@/lib/subscription';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db-init';

const getAuthUserId = cache(async (): Promise<string | null> => {
  const store = await cookies();
  if (!store.getAll().some(c => c.name.includes('-auth-token'))) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user?.id ?? null;
});

export const getCurrentStaff = cache(async () => {
  const authUserId = await getAuthUserId();
  if (!authUserId) return null;
  await ensureDatabaseSchema();
  return prisma.user.findUnique({ where: { authUserId }, include: { gym: true } });
});

export async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not logged in');
  if (!subscriptionActive(staff.gym)) throw new Error('Gym subscription is inactive. Contact NeuraFitness support.');
  return staff;
}

export const getCurrentMember = cache(async () => {
  const authUserId = await getAuthUserId();
  if (!authUserId) return null;
  await ensureDatabaseSchema();
  // Legacy phone-only cookies are intentionally ignored. Removing the auth link revokes access.
  return prisma.member.findUnique({ where: { authUserId }, include: { gym: true } });
});
