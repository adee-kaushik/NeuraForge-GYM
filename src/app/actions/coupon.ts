'use server';

import { validateCoupon, getAllCouponsSummary, type CouponValidationResult } from '@/lib/coupons';

export async function checkCoupon(code: string): Promise<CouponValidationResult> {
  return await validateCoupon(code);
}

export async function getActiveCoupons() {
  return await getAllCouponsSummary();
}
