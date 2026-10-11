import { randomInt } from 'crypto';

export const MEMBER_EMAIL_DOMAIN = 'members.neuraforge.app';

// No 0/O or 1/l/I, so the password is easy to read and type from a WhatsApp message
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

// Members log in with Gym code + Member ID + password. Supabase needs an email, so we build one
// from the first two. It never receives mail. Example: mem-001.ironpulse@members.neuraforge.app
export const memberEmail = (gymSlug: string, identifier: string) => {
  const cleanId = identifier.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanSlug = gymSlug.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  return `${cleanId}.${cleanSlug}@${MEMBER_EMAIL_DOMAIN}`;
};

export const generatePassword = (length = 8) =>
  Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
