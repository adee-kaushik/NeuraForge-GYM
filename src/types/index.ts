export type HunterRank = 'RANK S' | 'RANK A' | 'RANK B' | 'RANK C' | 'RANK E';

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  rank: HunterRank;
  planName: string;
  planDuration: 'Yearly' | 'Half-Yr' | 'Quarterly' | 'Monthly' | 'VIP';
  expiryDate: string; // e.g. '2024-10-26'
  daysLeft: number;
  status: 'active' | 'expiring' | 'expired';
  avatarInitials: string;
  rfidTag: string;
  joinDate: string;
  attendanceCountThisMonth: number;
  lastCheckIn?: string;
  pendingDue?: number;
}

export interface Transaction {
  id: string; // e.g. '#TXN-9082'
  memberId: string;
  memberName: string;
  memberEmail: string;
  planCategory: string;
  amount: number;
  paymentMode: 'Google Pay UPI' | 'PhonePe UPI' | 'Paytm UPI' | 'HDFC Debit Card' | 'Cash Settlement' | 'Credit Card';
  timestamp: string;
  status: 'PAID' | 'PENDING' | 'FAILED';
  invoiceNo: string;
  gstAmount: number;
}

export interface CheckInLog {
  id: string;
  memberId: string;
  memberName: string;
  rank: HunterRank;
  planDuration: string;
  time: string;
  gate: 'Gate 1 (Turnstile)' | 'Gate 2 (Iron Zone)';
  status: 'GRANTED' | 'DENIED' | 'RE-ENTRY';
  temperature?: string;
}

export interface MembershipPlan {
  id: string;
  rank: HunterRank;
  name: string;
  durationLabel: string;
  durationMonths: number;
  price: number;
  originalPrice?: number;
  activeCount: number;
  features: string[];
  popular?: boolean;
  color: string;
}

export type ActiveScreen = 'dashboard' | 'members' | 'memberships' | 'attendance' | 'payments' | 'settings';
