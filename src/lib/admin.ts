import { createClient } from '@/utils/supabase/server';
import { hasAdminAccess } from '@/lib/admin-policy';

export async function isNeuraFitnessAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return !error && hasAdminAccess(data.user);
}
export const isNeuraForgeAdmin = isNeuraFitnessAdmin;
