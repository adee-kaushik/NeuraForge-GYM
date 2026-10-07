import { createClient } from '@supabase/supabase-js';

// Admin Supabase client: can create logins and reset passwords.
// Server-only. SUPABASE_SECRET_KEY must never be exposed to the browser (no NEXT_PUBLIC_ prefix).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
