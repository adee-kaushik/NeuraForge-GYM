// Single source of truth for gym-level details.
// Later this comes from the `Gym` table (per-gym, loaded after login).
export interface GymConfig {
  name: string;
  shortName: string;
  initials: string;
  address: string;
  gstNumber: string; // empty string = not registered / not shown on invoices
  gstRatePercent: number;
  monthlyRevenueGoal: number;
}

export const GYM: GymConfig = {
  name: 'Iron Pulse Gym',
  shortName: 'Iron Pulse',
  initials: 'IP',
  address: 'Malviya Nagar, Jaipur',
  gstNumber: '',
  gstRatePercent: 18,
  monthlyRevenueGoal: 100000,
};

// Logged-in user. Later this comes from the auth session.
export const CURRENT_USER = {
  name: 'Karan Singhania',
  initials: 'KS',
  role: 'Gym Owner',
  email: 'admin@ironpulsegym.in',
};
