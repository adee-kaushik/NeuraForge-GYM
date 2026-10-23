import { normalizeServerKey } from '@/lib/server-env';
import { createClient } from '@supabase/supabase-js';

// Admin Supabase client: can create logins and reset passwords.
// Server-only. SUPABASE_SECRET_KEY must never be exposed to the browser (no NEXT_PUBLIC_ prefix).
export function createAdminClient() {
  const secretKey = normalizeServerKey(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '');
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
