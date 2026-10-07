'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { toGymConfig } from '@/lib/session';
import type { GymConfig, GymSettingsInput } from '@/config/gym';

// Standard 15-character GSTIN, e.g. 29ABCDE1234F1Z5
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export type SaveSettingsResult = { ok: true; gym: GymConfig } | { ok: false; error: string };

export async function updateGymSettings(input: GymSettingsInput): Promise<SaveSettingsResult> {
  const staff = await requireStaff();

  // Only the owner can change gym settings
  if (staff.role !== 'OWNER') return { ok: false, error: 'Only the gym owner can change settings.' };

  const name = input.name.trim();
  const address = input.address.trim();
  const gstNumber = input.gstNumber.trim().toUpperCase();
  const goal = input.monthlyRevenueGoal;

  if (!name || name.length > 80) return { ok: false, error: 'Gym name must be 1 to 80 characters.' };
  if (address.length > 200) return { ok: false, error: 'Address is too long.' };
  if (gstNumber && !GSTIN_RE.test(gstNumber)) {
    return { ok: false, error: 'Enter a valid 15-character GST number, or leave it empty.' };
  }
  if (!Number.isInteger(goal) || goal < 0 || goal > 100_000_000) {
    return { ok: false, error: 'Enter a valid monthly revenue goal.' };
  }

  // Always the logged-in user's own gym
  const gym = await prisma.gym.update({
    where: { id: staff.gymId },
    data: { name, address: address || null, gstNumber: gstNumber || null, monthlyRevenueGoal: goal },
  });

  return { ok: true, gym: toGymConfig(gym) };
}
