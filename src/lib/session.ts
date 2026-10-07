import type { CurrentUser, GymConfig } from '@/config/gym';

// Plain shapes of the database rows we need (kept structural so this file has no Prisma dependency)
type GymRow = {
  name: string;
  address: string | null;
  gstNumber: string | null;
  gstRatePercent: number;
  monthlyRevenueGoal: number;
};

type UserRow = {
  name: string;
  email: string;
  role: 'OWNER' | 'STAFF';
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
  shortName: gym.name.replace(/\s+gym$/i, ''),
  initials: initialsOf(gym.name),
  address: gym.address ?? '',
  gstNumber: gym.gstNumber ?? '',
  gstRatePercent: gym.gstRatePercent,
  monthlyRevenueGoal: gym.monthlyRevenueGoal,
});

export const toCurrentUser = (user: UserRow): CurrentUser => ({
  name: user.name,
  initials: initialsOf(user.name),
  role: user.role === 'OWNER' ? 'Gym Owner' : 'Staff',
  email: user.email,
});
