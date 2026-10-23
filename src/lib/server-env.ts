// Accommodate values pasted from .env files into a hosting provider's value field.
export function normalizeServerKey(raw: string): string {
  let value = raw.trim();
  value = value.replace(/^(?:SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*/, '');
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value.trim();
}
