'use server';

import { redirect } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PLANS } from '@/lib/default-plans';

export type SignupState = { error?: string };

// 3-30 chars: lowercase letters, numbers, hyphens (not at the start or end)
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED_SLUGS = new Set(['admin', 'api', 'app', 'login', 'signup', 'www', 'neuraforge']);

// Compares two strings without leaking, through timing, how many characters matched
const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function signupOwner(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const gymName = String(formData.get('gymName') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const inviteCode = String(formData.get('inviteCode') ?? '').trim();

  // Signup is invite-only for now. With no SIGNUP_CODE set, it is closed for everyone.
  const expectedCode = process.env.SIGNUP_CODE;
  if (!expectedCode) return { error: 'Signups are closed right now.' };
  if (!safeEqual(inviteCode, expectedCode)) return { error: 'Invalid invite code.' };

  if (!gymName || !name || !email) return { error: 'Please fill in all fields.' };
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) {
    return { error: 'Gym code must be 3-30 characters: lowercase letters, numbers and hyphens.' };
  }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  // Check the gym code first, so we don't create a login that we then can't use
  const taken = await prisma.gym.findUnique({ where: { slug } });
  if (taken) return { error: 'This gym code is already taken. Try another one.' };

  // The account is created by the server (admin), so Supabase's public signup can stay switched off
  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const exists = createError?.message?.toLowerCase().includes('already');
    return { error: exists ? 'An account with this email already exists.' : 'Could not create your account.' };
  }

  try {
    await prisma.gym.create({
      data: {
        name: gymName,
        slug,
        users: { create: { authUserId: created.user.id, name, email, role: 'OWNER' } },
        plans: { create: DEFAULT_PLANS },
      },
    });
  } catch {
    // Don't leave a login that belongs to no gym
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: 'Could not set up your gym. Please try again.' };
  }

  // Log the new owner in
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) redirect('/login');

  redirect('/');
}
