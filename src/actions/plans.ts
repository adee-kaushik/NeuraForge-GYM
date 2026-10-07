'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { toMembershipPlan } from '@/lib/plans';
import type { MembershipPlan, PlanInput } from '@/types';

export type SavePlanResult = { ok: true; plan: MembershipPlan } | { ok: false; error: string };

// Creates a plan, or updates one when input.id is set. Owner only.
// Changing a plan never changes old payments or existing memberships.
export async function savePlan(input: PlanInput): Promise<SavePlanResult> {
  const staff = await requireStaff();
  if (staff.role !== 'OWNER') return { ok: false, error: 'Only the gym owner can change plans.' };
  const gymId = staff.gymId;

  const name = input.name.trim();
  const features = input.features.map((f) => f.trim()).filter(Boolean);
  const { durationMonths, price, originalPrice } = input;

  if (!name || name.length > 40) return { ok: false, error: 'Plan name must be 1 to 40 characters.' };
  if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 36) {
    return { ok: false, error: 'Duration must be 1 to 36 months.' };
  }
  if (!Number.isInteger(price) || price < 1 || price > 1_000_000) return { ok: false, error: 'Enter a valid price.' };
  if (originalPrice !== undefined && (!Number.isInteger(originalPrice) || originalPrice < price)) {
    return { ok: false, error: 'The original price must be more than the price.' };
  }
  if (features.length > 8 || features.some((f) => f.length > 80)) {
    return { ok: false, error: 'Use up to 8 features, each under 80 characters.' };
  }

  const data = { name, durationMonths, price, originalPrice: originalPrice ?? null, features, popular: input.popular };

  const plan = await prisma.$transaction(async (tx) => {
    // Only one plan carries the "Most Popular" tag
    if (input.popular) await tx.plan.updateMany({ where: { gymId, id: { not: input.id ?? '' } }, data: { popular: false } });

    if (!input.id) return tx.plan.create({ data: { ...data, gymId } });

    // gymId in the query means a plan of another gym can never be changed here
    const res = await tx.plan.updateMany({ where: { id: input.id, gymId }, data });
    return res.count === 1 ? tx.plan.findUnique({ where: { id: input.id } }) : null;
  });

  return plan ? { ok: true, plan: toMembershipPlan(plan) } : { ok: false, error: 'Plan not found.' };
}
