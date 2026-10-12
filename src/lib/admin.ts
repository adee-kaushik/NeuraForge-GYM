import { createClient } from '@/utils/supabase/server';

// True only for NeuraFitness co-founder / team logins. The flag lives in the login's app_metadata, which only the
// Supabase dashboard/SQL (or our secret key) can change. Users cannot edit it themselves.
export async function isNeuraFitnessAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return false;

  // 1. Direct app_metadata set by Supabase service role
  if (
    data.user?.app_metadata?.neurafitness_admin === true ||
    data.user?.app_metadata?.neuraforge_admin === true ||
    data.user?.user_metadata?.is_admin === true
  ) {
    return true;
  }

  // 2. Co-founders / admin emails whitelist
  const adminEmails = (
    process.env.ADMIN_EMAILS ||
    'neura.fitness.crm@gmail.com,admin@neurafitness.com,founder@neurafitness.com,aditya@neurafitness.com,adityaamishra6002@gmail.com'
  )
    .split(',')
    .map((e) => e.trim().toLowerCase());

  if (data.user.email && adminEmails.includes(data.user.email.toLowerCase())) {
    return true;
  }

  return false;
}

export const isNeuraForgeAdmin = isNeuraFitnessAdmin;
