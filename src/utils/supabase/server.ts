import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-only Supabase client. Use it in server actions, route handlers and server components.
// Never import this file in a client component.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a server component, where cookies are read-only.
            // Safe to ignore: the middleware refreshes the session.
          }
        },
      },
    }
  );
}