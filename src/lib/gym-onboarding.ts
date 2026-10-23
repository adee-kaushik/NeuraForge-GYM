const RESERVED = new Set(['admin', 'api', 'app', 'login', 'signup', 'www', 'neuraforge', 'neurafitness']);

export function validateGymIdentity(slug: string, email: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug) || RESERVED.has(slug)) {
    return 'Gym code must be 3-30 characters: letters, numbers and hyphens, with no leading or trailing hyphen. Choose a non-reserved code.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid owner email address.';
  return null;
}

export function accountCreationError(error: { code?: string; status?: number } | null | undefined): string {
  if (['email_exists', 'user_already_exists'].includes(error?.code || '')) {
    return 'This owner email already has an account. Sign in to the existing account or use a different email for the new gym.';
  }
  if (error?.code === 'weak_password') return 'Choose a stronger owner password with uppercase, lowercase, numbers and symbols.';
  if (error?.status === 401 || error?.status === 403) return 'Onboarding configuration error: the Supabase server key is invalid or lacks admin access. Update SUPABASE_SECRET_KEY in Vercel and redeploy.';
  if (error?.status === 429) return 'Too many registration attempts. Please wait a few minutes and retry.';
  return 'Account creation is temporarily unavailable. Please retry or contact the NeuraFitness administrator.';
}
