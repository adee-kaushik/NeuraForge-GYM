// Plans every new gym starts with. The owner can change them later.
export interface DefaultPlan {
  name: string;
  durationMonths: number;
  price: number; // GST-inclusive, in rupees
  originalPrice?: number;
  features: string[];
  popular?: boolean;
}

export const DEFAULT_PLANS: DefaultPlan[] = [
  {
    name: 'VIP',
    durationMonths: 12,
    price: 32000,
    originalPrice: 38000,
    features: ['All gym areas', 'Personal locker', 'Steam and sauna', '2 guest passes per month', 'Personal trainer'],
  },
  {
    name: 'Yearly',
    durationMonths: 12,
    price: 18500,
    originalPrice: 22000,
    popular: true,
    features: ['All gym areas', 'Free locker for 12 months', 'Monthly body check', 'Group classes'],
  },
  {
    name: 'Half-Yearly',
    durationMonths: 6,
    price: 11000,
    originalPrice: 13500,
    features: ['Cardio and weights area', 'Steam room on weekends', 'Free diet consultation'],
  },
  {
    name: 'Quarterly',
    durationMonths: 3,
    price: 6200,
    originalPrice: 7500,
    features: ['Gym floor 6:00 AM to 10:30 PM', 'Locker room and shower', 'Starter workout plan'],
  },
  {
    name: 'Monthly',
    durationMonths: 1,
    price: 2500,
    features: ['Gym floor access', 'Locker for the day'],
  },
];
