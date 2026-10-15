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

import { getMemberSessionId } from '@/lib/member-session';

import { ensureDatabaseSchema } from '@/lib/db-init';

export const getCurrentMember = cache(async () => {
  await ensureDatabaseSchema().catch(() => {});
  // 1. Direct passwordless member session cookie
  const sessionMemberId = await getMemberSessionId();
  if (sessionMemberId) {
    try {
      const member = await prisma.member.findUnique({
        where: { id: sessionMemberId },
        include: { gym: true },
      });
      if (member) return member;
    } catch {
      // Fallback if schema is initializing
      try {
        const raw = await prisma.$queryRawUnsafe<any[]>(`
          SELECT m.*, g.name as "gym_name", g.slug as "gym_slug", g."upiId" as "gym_upiId", g."paymentQrUrl" as "gym_paymentQrUrl", g."bannerUrl" as "gym_bannerUrl"
          FROM "Member" m
          JOIN "Gym" g ON g.id = m."gymId"
          WHERE m.id = $1 LIMIT 1
        `, sessionMemberId);
        if (raw && raw[0]) {
          const row = raw[0];
          return {
            ...row,
            gym: {
              id: row.gymId,
              name: row.gym_name || 'Gym',
              slug: row.gym_slug || '',
              upiId: row.gym_upiId || null,
              paymentQrUrl: row.gym_paymentQrUrl || null,
              bannerUrl: row.gym_bannerUrl || null,
            },
          };
        }
      } catch {
        return null;
      }
    }
  }

  // 2. Fallback to Supabase auth user id
  const authUserId = await getAuthUserId();
  if (!authUserId) return null;

  try {
    return await prisma.member.findUnique({
      where: { authUserId },
      include: { gym: true },
    });
  } catch {
    try {
      const raw = await prisma.$queryRawUnsafe<any[]>(`
        SELECT m.*, g.name as "gym_name", g.slug as "gym_slug", g."upiId" as "gym_upiId", g."paymentQrUrl" as "gym_paymentQrUrl", g."bannerUrl" as "gym_bannerUrl"
        FROM "Member" m
        JOIN "Gym" g ON g.id = m."gymId"
        WHERE m."authUserId" = $1 LIMIT 1
      `, authUserId);
      if (raw && raw[0]) {
        const row = raw[0];
        return {
          ...row,
          gym: {
            id: row.gymId,
            name: row.gym_name || 'Gym',
            slug: row.gym_slug || '',
            upiId: row.gym_upiId || null,
            paymentQrUrl: row.gym_paymentQrUrl || null,
            bannerUrl: row.gym_bannerUrl || null,
          },
        };
      }
    } catch {
      return null;
    }
    return null;
  }
});
