// ─────────────────────────────────────────────────────────────
// Two layers of types:
//   *Record  = database-shaped data (ISO dates, no derived fields).
//              This is what the backend / Prisma will return.
//   Member, Transaction, CheckInLog = view models the UI renders
//              (formatted dates + derived fields). Built in lib/mappers.ts
// ─────────────────────────────────────────────────────────────

export type PaymentMode = 'UPI' | 'Card' | 'Cash';
export type PaymentStatus = 'PAID' | 'PENDING';
export type MemberStatus = 'active' | 'expiring' | 'expired';

// Plans are created by each gym owner, so the name is free text (not a fixed union).
export type PlanDuration = string;

// ── Records (DB shape) ───────────────────────────────────────
export interface MembershipPlan {
  id: string;
  name: string;
  durationLabel: string;
  durationMonths: number;
  price: number; // GST-inclusive
  originalPrice?: number;
  features: string[];
  popular?: boolean;
}

export interface MemberRecord {
  id: string;
  memberCode: string; // e.g. 'MEM-001', unique within a gym
  name: string;
  phone: string;
  email: string;
  planId: string;
  joinedAt: string; // ISO
  expiresAt: string; // ISO
}

export interface TransactionRecord {
  id: string; // e.g. '#TXN-9082'
  memberId: string;
  memberName: string;
  memberEmail: string;
  planCategory: string;
  amount: number; // GST-inclusive
  paymentMode: PaymentMode;
  status: PaymentStatus;
  invoiceNo: string;
  gstAmount: number;
  createdAt: string; // ISO
}

export interface CheckInRecord {
  id: string;
  memberId: string;
  checkedInAt: string; // ISO
}

// ── View models (what components render) ─────────────────────
export interface Member extends MemberRecord {
  planName: string;
  planDuration: PlanDuration;
  expiryDate: string; // formatted, e.g. '26 Oct 2026'
  joinDate: string; // formatted
  daysLeft: number; // derived from expiresAt
  status: MemberStatus; // derived from daysLeft
  avatarInitials: string;
  attendanceCountThisMonth: number; // derived from check-ins
  lastCheckIn?: string; // derived from check-ins
  pendingDue?: number; // derived from PENDING payments
}

export interface Transaction extends TransactionRecord {
  timestamp: string; // formatted createdAt
}

export interface CheckInLog extends CheckInRecord {
  memberName: string;
  planDuration: PlanDuration;
  time: string; // formatted time
}

export type ActiveScreen = 'dashboard' | 'members' | 'memberships' | 'attendance' | 'payments' | 'settings';

// ── Form inputs (UI -> App handlers; App/backend builds the records) ──
export interface NewMemberInput {
  name: string;
  phone: string;
  email: string;
  planId: string;
  recordPayment: boolean;
  paymentMode: PaymentMode;
}

export interface NewPaymentInput {
  memberId: string;
  amount: number;
  paymentMode: PaymentMode;
}
