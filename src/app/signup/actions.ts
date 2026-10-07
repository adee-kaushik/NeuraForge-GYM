'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PLANS } from '@/lib/default-plans';

export type SignupState = { error?: string };

// 3-30 chars: lowercase letters, numbers, hyphens (not at the start or end)
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED_SLUGS = new Set(['admin', 'api', 'app', 'login', 'signup', 'www', 'neuraforge']);

export async function signupOwner(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const gymName = String(formData.get('gymName') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!gymName || !name || !email) return { error: 'Please fill in all fields.' };
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) {
    return { error: 'Gym code must be 3-30 characters: lowercase letters, numbers and hyphens.' };
  }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  // Check the gym code first, so we don't create a login that we then can't use
  const taken = await prisma.gym.findUnique({ where: { slug } });
  if (taken) return { error: 'This gym code is already taken. Try another one.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return { error: error?.message ?? 'Could not create your account.' };

  try {
    await prisma.gym.create({
      data: {
        name: gymName,
        slug,
        users: { create: { authUserId: data.user.id, name, email, role: 'OWNER' } },
        plans: { create: DEFAULT_PLANS },
      },
    });
  } catch {
    return { error: 'Could not set up your gym. Please try again.' };
  }

  redirect('/');
}
