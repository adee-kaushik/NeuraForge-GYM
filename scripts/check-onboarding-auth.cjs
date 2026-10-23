// Read-only deployment check. Never log keys, user data, or response bodies.
const { createClient } = require('@supabase/supabase-js');
(async () => {
  if (!process.env.VERCEL) return;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const raw = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  let key = raw.replace(/^(?:SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*/, '');
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1,-1);
  key = key.trim();
  if (!url || !key) { console.warn('ONBOARDING_AUTH_CHECK missing_server_configuration'); return; }
  try {
    const client = createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false}});
    const {error} = await client.auth.admin.listUsers({page:1,perPage:1});
    console.log('ONBOARDING_AUTH_CHECK', JSON.stringify(error ? {ok:false,status:error.status,code:error.code || 'unknown',keyKind:key.startsWith('sb_secret_')?'secret':key.startsWith('eyJ')?'legacy-jwt':'other'} : {ok:true}));
  } catch { console.warn('ONBOARDING_AUTH_CHECK connection_failed'); }
})();
