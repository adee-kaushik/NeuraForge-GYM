export type PlanDuration = 'Yearly' | 'Half-Yearly' | 'Quarterly' | 'Monthly' | 'VIP';

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  planName: string;
  planDuration: PlanDuration;
  expiryDate: string; // e.g. '26 Oct 2024'
  daysLeft: number;
  status: 'active' | 'expiring' | 'expired';
  avatarInitials: string;
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
  paymentMode: 'UPI' | 'Card' | 'Cash';
  timestamp: string;
  status: 'PAID' | 'PENDING' | 'FAILED';
  invoiceNo: string;
  gstAmount: number;
}

export interface CheckInLog {
  id: string;
  memberId: string;
  memberName: string;
  planDuration: string;
  time: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  durationLabel: string;
  durationMonths: number;
  price: number;
  originalPrice?: number;
  activeCount: number;
  features: string[];
  popular?: boolean;
}

export type ActiveScreen = 'dashboard' | 'members' | 'memberships' | 'attendance' | 'payments' | 'settings';
