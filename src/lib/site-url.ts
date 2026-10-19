export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  const fallback = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://neurafitness.vercel.app';
  const url = new URL(configured || fallback);
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost' && url.protocol === 'http:')) {
    throw new Error('Site URL must use HTTPS');
  }
  return url.origin;
}
