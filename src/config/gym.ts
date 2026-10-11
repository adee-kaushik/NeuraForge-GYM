// Gym-level details used across the UI. Loaded from the `Gym` table after login.
// GYM below is only a fallback/demo value for the mock data.
export interface GymConfig {
  name: string;
  slug: string;
  shortName: string;
  initials: string;
  address: string;
  gstNumber: string; // empty string = not registered / not shown on invoices
  gstRatePercent: number;
  monthlyRevenueGoal: number;
  upiId?: string; // UPI ID for member QR payments
  paymentQrUrl?: string; // Custom uploaded UPI QR code image or data URL
}

// What the owner can edit on the Settings screen
export interface GymSettingsInput {
  name: string;
  address: string;
  gstNumber: string;
  monthlyRevenueGoal: number;
  upiId?: string;
  paymentQrUrl?: string;
}

export const GYM: GymConfig = {
  name: 'Iron Pulse Gym',
  slug: 'iron-pulse',
  shortName: 'Iron Pulse',
  initials: 'IP',
  address: 'Malviya Nagar, Jaipur',
  gstNumber: '',
  gstRatePercent: 18,
  monthlyRevenueGoal: 100000,
  upiId: '',
  paymentQrUrl: '',
};

// The logged-in owner/staff member, shown in the header. Comes from the auth session.
export interface CurrentUser {
  name: string;
  initials: string;
  role: string;
  email: string;
}
