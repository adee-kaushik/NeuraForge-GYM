'use server';

import { redirect } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PLANS } from '@/lib/default-plans';

export type SignupState = {
  error?: string;
  success?: boolean;
  whatsappUrl?: string;
  gymName?: string;
  slug?: string;
  requiresPayment?: boolean;
};

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
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const couponCode = String(formData.get('couponCode') ?? '').trim();

  let plan = String(formData.get('plan') ?? 'trial').trim();
  if (!['trial', '6months', '1year', 'pilot'].includes(plan)) {
    plan = 'trial';
  }

  const isFirstCustomer = await checkIsFirstCustomer();

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

  // Pricing & Status calculation
  const isPaid = plan === '6months' || plan === '1year';
  const basePrice = plan === '6months' ? 3000 : plan === '1year' ? 5000 : 0;
  let setupFee = isPaid ? 1999 : 0;
  if (couponCode) {
    if (couponCode.toUpperCase() === 'SETUP50') setupFee = Math.round(setupFee * 0.5);
    else if (couponCode.toUpperCase() === 'SETUP30') setupFee = Math.round(setupFee * 0.7);
    else if (couponCode.toUpperCase() === 'SETUP10') setupFee = Math.round(setupFee * 0.9);
  }
  const totalAmount = isPaid ? basePrice + setupFee : 0;

  // Free trial and pilot partner are active immediately; paid plans await WhatsApp UPI approval
  const saasStatus = isFirstCustomer || !isPaid ? 'ACTIVE' : 'PENDING_APPROVAL';
  const saasPlan = isFirstCustomer ? 'PILOT_PARTNER' : plan === 'trial' ? 'TRIAL_14_DAYS' : plan.toUpperCase();
  const durationDays = plan === '1year' ? 365 : plan === '6months' ? 180 : 30;
  const expiresAt = new Date(Date.now() + durationDays * 86400000);

  try {
    await prisma.gym.create({
      data: {
        name: gymName,
        slug,
        saasPlan,
        saasStatus,
        subscriptionAmount: totalAmount,
        saasApprovedAt: saasStatus === 'ACTIVE' ? new Date() : null,
        saasExpiresAt: saasStatus === 'ACTIVE' ? expiresAt : null,
        isSuspended: saasStatus === 'PENDING_APPROVAL',
        users: { create: { authUserId, name, email, phone: phone || null, role: 'OWNER' } },
        plans: { create: DEFAULT_PLANS },
      },
    });

    if (couponCode && !isFirstCustomer) {
      const { recordCouponUsage } = await import('@/lib/coupons');
      await recordCouponUsage(couponCode, slug);
    }
  } catch {
    try {
      await admin.auth.admin.deleteUser(authUserId);
    } catch {}
    return { error: 'Could not set up your gym. Please try again.' };
  }

  // Auto-login the owner session
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });

  const planLabel =
    plan === '1year'
      ? '1-Year Annual Pro Plan'
      : plan === '6months'
      ? '6-Month Semi-Annual Plan'
      : isFirstCustomer
      ? 'Pilot Launch Partner (Free)'
      : '1-Month Free Trial';

  const whatsappMessage =
    `Hi NeuraFitness Team! I registered our gym on the portal and want to activate our SaaS via UPI payment.\n\n` +
    `🏋️ *Gym Name:* ${gymName}\n` +
    `🔗 *Gym Code:* ${slug}\n` +
    `👤 *Owner:* ${name}\n` +
    `📧 *Email:* ${email}\n` +
    (phone ? `📱 *Phone:* ${phone}\n` : '') +
    `💳 *Plan:* ${planLabel}\n` +
    (isPaid ? `💰 *Amount to Pay:* ₹${totalAmount.toLocaleString('en-IN')}\n\n` : `🎉 *Status:* 1-Month Free Trial\n\n`) +
    `Please share your UPI QR code / VPA to complete payment and approve our Gym OS account.`;

  const whatsappUrl = `https://wa.me/919351219914?text=${encodeURIComponent(whatsappMessage)}`;

  return {
    success: true,
    whatsappUrl,
    gymName,
    slug,
    requiresPayment: isPaid,
  };
}

