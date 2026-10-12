'use server';

import { redirect } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PLANS } from '@/lib/default-plans';

export type SignupState = { error?: string; success?: boolean };

// 3-30 chars: lowercase letters, numbers, hyphens (not at the start or end)
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED_SLUGS = new Set(['admin', 'api', 'app', 'login', 'signup', 'www', 'neuraforge', 'neurafitness']);

// Compares two strings without leaking, through timing, how many characters matched
const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function checkIsFirstCustomer(): Promise<boolean> {
  try {
    // If gym count is <= 1 (only the developer's test gym exists), this signup is the very first real customer.
    // Once this first customer registers, gym count becomes >= 2 and it automatically sticks to regular plans.
    const count = await prisma.gym.count();
    return count <= 1;
  } catch {
    return false;
  }
}

export async function signupOwner(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const gymName = String(formData.get('gymName') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const inviteCode = String(formData.get('inviteCode') ?? '').trim();

  const plan = String(formData.get('plan') ?? '').trim();
  const mandateId = String(formData.get('mandateId') ?? '').trim();
  const couponCode = String(formData.get('couponCode') ?? '').trim();
  const validPlans = ['trial', '6months', '1year'];

  const isFirstCustomer = await checkIsFirstCustomer();

  // If this is the very first customer, payment details / mandates are waived for real customer testing.
  // Once registered, subsequent gyms must follow the plans.
  if (!isFirstCustomer) {
    const hasValidPlan = validPlans.includes(plan);
    const expectedCode = process.env.SIGNUP_CODE;
    const hasValidInvite = expectedCode && inviteCode ? safeEqual(inviteCode, expectedCode) : false;

    if (!hasValidPlan && !hasValidInvite) {
      return { error: 'Please select a subscription plan or activate your 1-month free trial first.' };
    }

    if (plan === 'trial' && !mandateId && !hasValidInvite) {
      return { error: 'UPI or Card Autopay mandate is required for the 1-month free trial.' };
    }
  }

  if (!gymName || !name || !email) return { error: 'Please fill in all fields.' };
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) {
    return { error: 'Gym code must be 3-30 characters: lowercase letters, numbers and hyphens.' };
  }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  // Check the gym code first, so we don't create a login that we then can't use
  const taken = await prisma.gym.findUnique({ where: { slug } });
  if (taken) return { error: 'This gym code is already taken. Try another one.' };

  // Create user in Supabase Auth (tries admin client, falls back to public signup)
  let authUserId = '';
  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created?.user) {
    authUserId = created.user.id;
  } else {
    const supabase = await createClient();
    const { data: publicCreated, error: publicError } = await supabase.auth.signUp({ email, password });
    if (publicError || !publicCreated.user) {
      const exists = (createError?.message || publicError?.message)?.toLowerCase().includes('already');
      return { error: exists ? 'An account with this email already exists.' : 'Could not create your account.' };
    }
    authUserId = publicCreated.user.id;
  }

  try {
    const oneYearFromNow = new Date(Date.now() + 365 * 86400000);
    await prisma.gym.create({
      data: {
        name: gymName,
        slug,
        saasPlan: isFirstCustomer ? 'PILOT_PARTNER' : (plan === 'trial' ? 'TRIAL_14_DAYS' : plan.toUpperCase()),
        saasStatus: 'ACTIVE',
        saasApprovedAt: new Date(),
        saasExpiresAt: isFirstCustomer ? oneYearFromNow : undefined,
        users: { create: { authUserId, name, email, role: 'OWNER' } },
        plans: { create: DEFAULT_PLANS },
      },
    });

    if (couponCode && !isFirstCustomer) {
      const { recordCouponUsage } = await import('@/lib/coupons');
      await recordCouponUsage(couponCode, slug);
    }
  } catch {
    // Don't leave a login that belongs to no gym
    try {
      await admin.auth.admin.deleteUser(authUserId);
    } catch {
      // ignore
    }
    return { error: 'Could not set up your gym. Please try again.' };
  }

  // Log the new owner in
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { error: 'Gym registered, but could not sign in automatically. Please visit the login page.' };

  return { success: true };
}

