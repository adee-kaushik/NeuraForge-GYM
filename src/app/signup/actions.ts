'use server';

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

// Pilot activation is an administrator decision, never inferred from public signup counts.
export async function checkIsFirstCustomer(): Promise<boolean> { return false; }

export async function signupOwner(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const gymName = String(formData.get('gymName') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  let plan = String(formData.get('plan') ?? 'monthly').trim();
  if (!['base_1m', 'base_6m', 'base_1y', 'pro_6m', 'pro_1y', 'monthly', '6months', '1year'].includes(plan)) {
    return { error: 'Please select a valid paid plan.' };
  }


  if (!gymName || !name || !email) return { error: 'Please fill in all fields.' };
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) {
    return { error: 'Gym code must be 3-30 characters: lowercase letters, numbers and hyphens.' };
  }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  // Check the gym code first, so we don't create a login that we then can't use
  const taken = await prisma.gym.findUnique({ where: { slug } });
  if (taken) return { error: 'This gym code is already taken. Try another one.' };

  // Create only a new auth account; never link a public-signup placeholder account.
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
    return { error: 'Could not create your account. If you already registered, please sign in.' };
  }

  // Pricing & Status calculation:
  // Base plan: 1m (₹999), 6m (₹2,399 + 1m free demo), 1y (₹3,499 + 1m free demo)
  // Pro plan: 6m (₹3,499 - 1 customization free), 1y (₹5,499 - 2 customization free)
  const isPaid = true;
  let basePrice = 0;
  let durationDays = 30;
  let planLabel = '1-Month Free Trial';

  if (plan === 'base_1m' || plan === 'monthly') {
    basePrice = 999;
    durationDays = 30;
    planLabel = 'Base Plan: 1 Month Demo (₹999)';
  } else if (plan === 'base_6m' || plan === '6months') {
    basePrice = 2399;
    durationDays = 210; // 6 months + 1 month free demo = 7 months
    planLabel = 'Base Plan: 6 Months + 1 Mo Free Demo (₹2,399)';
  } else if (plan === 'base_1y' || plan === '1year') {
    basePrice = 3499;
    durationDays = 395; // 12 months + 1 month free demo = 13 months
    planLabel = 'Base Plan: 1 Year + 1 Mo Free Demo (₹3,499)';
  } else if (plan === 'pro_6m') {
    basePrice = 3499;
    durationDays = 180;
    planLabel = 'Pro Plan: 6 Months (1 Customization Free - ₹3,499)';
  } else if (plan === 'pro_1y') {
    basePrice = 5499;
    durationDays = 365;
    planLabel = 'Pro Plan: 1 Year (2 Customizations Free - ₹5,499)';
  }

  const totalAmount = isPaid ? basePrice : 0;

  // Free trial and pilot partner are active immediately; paid plans await WhatsApp UPI approval
  const saasStatus = 'PENDING_APPROVAL';
  const saasPlan = plan.toUpperCase();
  const expiresAt = new Date(Date.now() + durationDays * 86400000);

  try {
    await prisma.gym.create({
      data: {
        name: gymName,
        slug,
        saasPlan,
        saasStatus,
        subscriptionAmount: totalAmount,
        saasApprovedAt: null,
        saasExpiresAt: null,
        isSuspended: saasStatus === 'PENDING_APPROVAL',
        users: { create: { authUserId, name, email, phone: phone || null, role: 'OWNER' } },
        plans: { create: DEFAULT_PLANS },
      },
    });


  } catch {
    try {
      await admin.auth.admin.deleteUser(authUserId);
    } catch {}
    return { error: 'Could not set up your gym. Please try again.' };
  }

  // Auto-login the owner session
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });

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

