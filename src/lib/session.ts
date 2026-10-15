import type { CurrentUser, GymConfig } from '@/config/gym';

// Plain shapes of the database rows we need (kept structural so this file has no Prisma dependency)
type GymRow = {
  name: string;
  slug: string;
  address: string | null;
  gstNumber: string | null;
  gstRatePercent: number;
  monthlyRevenueGoal: number;
  upiId?: string | null;
  paymentQrUrl?: string | null;
  bannerUrl?: string | null;
  tagline?: string | null;
};

type UserRow = {
  name: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  avatarUrl?: string | null;
};

const initialsOf = (text: string): string =>
  text
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

export const toGymConfig = (gym: GymRow): GymConfig => ({
  name: gym.name,
  slug: gym.slug,
  shortName: gym.name.replace(/\s+gym$/i, ''),
  initials: initialsOf(gym.name),
  address: gym.address ?? '',
  gstNumber: gym.gstNumber ?? '',
  gstRatePercent: gym.gstRatePercent,
  monthlyRevenueGoal: gym.monthlyRevenueGoal,
  upiId: gym.upiId ?? '',
  paymentQrUrl: gym.paymentQrUrl ?? '',
  bannerUrl: gym.bannerUrl ?? '',
  tagline: gym.tagline ?? '',
});

export const toCurrentUser = (user: UserRow): CurrentUser => ({
  name: user.name,
  initials: initialsOf(user.name),
  role: user.role === 'OWNER' ? 'Gym Owner' : 'Staff',
  email: user.email,
  avatarUrl: user.avatarUrl ?? null,
});
