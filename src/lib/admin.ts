import { createClient } from '@/utils/supabase/server';

// True only for NeuraForge team logins. The flag lives in the login's app_metadata, which only the
// Supabase dashboard/SQL (or our secret key) can change. Users cannot edit it themselves.
export async function isNeuraForgeAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.app_metadata?.neuraforge_admin === true;
}
