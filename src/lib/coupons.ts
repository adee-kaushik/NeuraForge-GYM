import { prisma } from './prisma';

export const BASE_SETUP_FEE = 10000;

export interface CouponDefinition {
  code: string;
  name: string;
  discountPercent: number; // e.g. 50, 30, 10
  discountAmount: number; // calculated on ₹10,000 setup fee
  expiresAt: string; // ISO string
  expiryDateFormatted: string;
  maxUses: number;
  description: string;
  badge: string;
}

export const COUPON_DEFINITIONS: Record<string, CouponDefinition> = {
  SETUP50: {
    code: 'SETUP50',
    name: '50% Customization Fee Discount',
    discountPercent: 50,
    discountAmount: 5000,
    expiresAt: '2026-12-31T23:59:59.999Z',
    expiryDateFormatted: 'Dec 31, 2026',
    maxUses: 5,
    description: 'Get 50% OFF on one-time customization fee (Save ₹5,000)',
    badge: '50% OFF Customization',
  },
  SETUP30: {
    code: 'SETUP30',
    name: '30% Customization Fee Discount',
    discountPercent: 30,
    discountAmount: 3000,
    expiresAt: '2026-12-31T23:59:59.999Z',
    expiryDateFormatted: 'Dec 31, 2026',
    maxUses: 5,
    description: 'Get 30% OFF on one-time customization fee (Save ₹3,000)',
    badge: '30% OFF Customization',
  },
  SETUP10: {
    code: 'SETUP10',
    name: '10% Customization Fee Discount',
    discountPercent: 10,
    discountAmount: 1000,
    expiresAt: '2026-12-31T23:59:59.999Z',
    expiryDateFormatted: 'Dec 31, 2026',
    maxUses: 5,
    description: 'Get 10% OFF on one-time customization fee (Save ₹1,000)',
    badge: '10% OFF Customization',
  },
};

// Aliases for user convenience (case-insensitive)
const CODE_ALIASES: Record<string, string> = {
  SETUP50: 'SETUP50',
  SAVE50: 'SETUP50',
  '50OFF': 'SETUP50',
  SETUP30: 'SETUP30',
  SAVE30: 'SETUP30',
  '30OFF': 'SETUP30',
  SETUP10: 'SETUP10',
  SAVE10: 'SETUP10',
  '10OFF': 'SETUP10',
};

// In-memory fallback if database table isn't migrated yet
const inMemoryRedemptions: Array<{ couponCode: string; gymSlug?: string; createdAt: Date }> = [];
let dbTableChecked = false;

async function ensureTable() {
  if (dbTableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CouponRedemption" (
        "id" TEXT PRIMARY KEY,
        "couponCode" TEXT NOT NULL,
        "gymSlug" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "CouponRedemption_couponCode_idx" ON "CouponRedemption"("couponCode");
    `);
    dbTableChecked = true;
  } catch {
    // If permission or pooler restricts DDL, continue with graceful fallback
    dbTableChecked = true;
  }
}

export function normalizeCouponCode(code: string): string {
  const clean = code.trim().toUpperCase();
  return CODE_ALIASES[clean] || clean;
}

export async function getCouponUsageCount(canonicalCode: string): Promise<number> {
  await ensureTable();
  try {
    const count = await prisma.couponRedemption.count({
      where: { couponCode: canonicalCode },
    });
    return count;
  } catch {
    // Fallback to memory tracking
    return inMemoryRedemptions.filter((r) => r.couponCode === canonicalCode).length;
  }
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponDefinition;
  discountAmount: number;
  remainingUses: number;
  usedCount: number;
  error?: string;
}

export async function validateCoupon(inputCode: string): Promise<CouponValidationResult> {
  const canonicalCode = normalizeCouponCode(inputCode);
  const coupon = COUPON_DEFINITIONS[canonicalCode];

  if (!coupon) {
    return {
      valid: false,
      discountAmount: 0,
      remainingUses: 0,
      usedCount: 0,
      error: 'Invalid coupon code. Try SETUP50, SETUP30, or SETUP10.',
    };
  }

  // Check Expiry Date (December 31, 2026)
  const now = new Date();
  const expiry = new Date(coupon.expiresAt);
  if (now.getTime() > expiry.getTime()) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      remainingUses: 0,
      usedCount: coupon.maxUses,
      error: `Coupon ${coupon.code} expired on ${coupon.expiryDateFormatted}.`,
    };
  }

  // Check Usage Cap (5 times maximum per coupon category)
  const usedCount = await getCouponUsageCount(canonicalCode);
  const remainingUses = Math.max(0, coupon.maxUses - usedCount);

  if (usedCount >= coupon.maxUses) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      remainingUses: 0,
      usedCount,
      error: `Coupon ${coupon.code} has reached its limit of ${coupon.maxUses} uses and has expired.`,
    };
  }

  return {
    valid: true,
    coupon,
    discountAmount: coupon.discountAmount,
    remainingUses,
    usedCount,
  };
}

export async function recordCouponUsage(
  inputCode: string,
  gymSlug?: string
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateCoupon(inputCode);
  if (!validation.valid || !validation.coupon) {
    return { success: false, error: validation.error || 'Coupon cannot be redeemed.' };
  }

  const canonicalCode = validation.coupon.code;

  await ensureTable();
  try {
    await prisma.couponRedemption.create({
      data: {
        couponCode: canonicalCode,
        gymSlug: gymSlug || null,
      },
    });
  } catch {
    inMemoryRedemptions.push({
      couponCode: canonicalCode,
      gymSlug,
      createdAt: new Date(),
    });
  }

  return { success: true };
}

export async function getAllCouponsSummary() {
  const list = await Promise.all(
    Object.values(COUPON_DEFINITIONS).map(async (def) => {
      const usedCount = await getCouponUsageCount(def.code);
      const remainingUses = Math.max(0, def.maxUses - usedCount);
      const now = new Date();
      const isDateExpired = now.getTime() > new Date(def.expiresAt).getTime();
      const isExpired = isDateExpired || remainingUses <= 0;

      return {
        ...def,
        usedCount,
        remainingUses,
        isExpired,
      };
    })
  );

  return list;
}
