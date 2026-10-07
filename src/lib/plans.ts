import type { Plan } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PLANS } from '@/lib/default-plans';
import type { MembershipPlan } from '@/types';

const durationLabel = (months: number): string => {
  if (months === 1) return '1 month';
  if (months === 12) return '12 months';
  return `${months} months`;
};

export const toMembershipPlan = (p: Plan): MembershipPlan => ({
  id: p.id,
  name: p.name,
  durationLabel: durationLabel(p.durationMonths),
  durationMonths: p.durationMonths,
  price: p.price,
  originalPrice: p.originalPrice ?? undefined,
  features: p.features,
  popular: p.popular,
});

// Loads the gym's active plans. Gyms created before default plans existed get them here once.
export async function getPlansForGym(gymId: string): Promise<MembershipPlan[]> {
  let rows = await prisma.plan.findMany({
    where: { gymId, isActive: true },
    orderBy: { price: 'desc' },
  });

  if (rows.length === 0) {
    const anyPlan = await prisma.plan.count({ where: { gymId } });
    if (anyPlan === 0) {
      await prisma.plan.createMany({ data: DEFAULT_PLANS.map((p) => ({ ...p, gymId })) });
      rows = await prisma.plan.findMany({ where: { gymId, isActive: true }, orderBy: { price: 'desc' } });
    }
  }

  return rows.map(toMembershipPlan);
}
