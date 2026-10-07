import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

// Returns the logged-in owner/staff user (with their gym), or null.
// A member also has a Supabase login but no row in the User table, so they get null here.
export async function getCurrentStaff() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return prisma.user.findUnique({
    where: { authUserId: data.user.id },
    include: { gym: true },
  });
}

// For server actions: the logged-in owner/staff, or an error. The gym always comes from here,
// never from anything the browser sends.
export async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not logged in');
  return staff;
}
