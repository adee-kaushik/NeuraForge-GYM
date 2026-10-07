// Gym-level details used across the UI. Loaded from the `Gym` table after login.
// GYM below is only a fallback/demo value for the mock data.
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

// The logged-in owner/staff member, shown in the header. Comes from the auth session.
export interface CurrentUser {
  name: string;
  initials: string;
  role: string;
  email: string;
}
