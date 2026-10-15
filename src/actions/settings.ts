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
  const upiId = input.upiId?.trim() || null;
  const paymentQrUrl = input.paymentQrUrl?.trim() || null;
  const bannerUrl = input.bannerUrl?.trim() || null;
  const tagline = input.tagline?.trim() || null;

  if (!name || name.length > 80) return { ok: false, error: 'Gym name must be 1 to 80 characters.' };
  if (address.length > 200) return { ok: false, error: 'Address is too long.' };
  if (gstNumber && !GSTIN_RE.test(gstNumber)) {
    return { ok: false, error: 'Enter a valid 15-character GST number, or leave it empty.' };
  }
  if (!Number.isInteger(goal) || goal < 0 || goal > 100_000_000) {
    return { ok: false, error: 'Enter a valid monthly revenue goal.' };
  }

  // Validate and clean unique gym code (slug) if provided
  let cleanedSlug: string | undefined = undefined;
  if (input.slug !== undefined) {
    cleanedSlug = input.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanedSlug || cleanedSlug.length < 2 || cleanedSlug.length > 50) {
      return { ok: false, error: 'Gym code must be between 2 and 50 characters (letters, numbers, hyphens).' };
    }

    // Ensure unique across all gyms
    const existingGymWithSlug = await prisma.gym.findFirst({
      where: {
        slug: cleanedSlug,
        NOT: { id: staff.gymId },
      },
    });

    if (existingGymWithSlug) {
      return { ok: false, error: `Gym code "${cleanedSlug}" is already taken by another gym. Please choose a unique code.` };
    }
  }

  // Always the logged-in user's own gym
  const gym = await prisma.gym.update({
    where: { id: staff.gymId },
    data: {
      name,
      ...(cleanedSlug ? { slug: cleanedSlug } : {}),
      address: address || null,
      gstNumber: gstNumber || null,
      monthlyRevenueGoal: goal,
      upiId,
      paymentQrUrl,
      bannerUrl,
      tagline,
    },
  });

  return { ok: true, gym: toGymConfig(gym) };
}

export async function updateOwnerAvatar(avatarUrl: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();

  try {
    await prisma.user.update({
      where: { id: staff.id },
      data: { avatarUrl },
    });
    return { ok: true };
  } catch {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "avatarUrl" = $1 WHERE id = $2`,
        avatarUrl,
        staff.id
      );
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Could not update profile photo.' };
    }
  }
}

export async function updateGymBanner(bannerUrl: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (staff.role !== 'OWNER') return { ok: false, error: 'Only owners can update gym banner.' };

  try {
    await prisma.gym.update({
      where: { id: staff.gymId },
      data: { bannerUrl },
    });
    return { ok: true };
  } catch {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Gym" SET "bannerUrl" = $1 WHERE id = $2`,
        bannerUrl,
        staff.gymId
      );
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Could not update banner.' };
    }
  }
}
