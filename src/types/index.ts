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

export interface PlanInput {
  id?: string; // empty = create a new plan
  name: string;
  durationMonths: number;
  price: number; // GST-inclusive
  originalPrice?: number;
  features: string[];
  popular: boolean;
}

// Owner or staff login of a gym, as listed in Settings
export interface StaffRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'STAFF';
}

export interface MemberRecord {
  id: string;
  memberCode: string; // e.g. 'MEM-001', unique within a gym
  name: string;
  phone: string;
  email: string;
  dob?: string | null;
  timingSlot?: 'MORNING' | 'EVENING' | 'BOTH' | string | null;
  weight?: number | null; // in kg
  height?: number | null; // in cm
  bmi?: number | null;
  bmiCategory?: string | null;
  planId: string;
  joinedAt: string; // ISO
  expiresAt: string; // ISO
  hasLogin?: boolean; // true once the owner has created the member's app login
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
  discountAmount?: number;
  notes?: string | null;
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
  dobFormatted?: string;
  isBirthdayToday?: boolean;
  daysUntilBirthday?: number | null;
  age?: number | null;
  daysLeft: number; // derived from expiresAt
  status: MemberStatus; // derived from daysLeft
  avatarInitials: string;
  attendanceCountThisMonth: number; // derived from check-ins
  lastCheckIn?: string; // derived from check-ins
  pendingDue?: number; // derived from PENDING payments
  timingSlotFormatted?: string;
}

export interface Transaction extends TransactionRecord {
  timestamp: string; // formatted createdAt
}

export interface CheckInLog extends CheckInRecord {
  memberName: string;
  planDuration: PlanDuration;
  time: string; // formatted time
}

export type ActiveScreen =
  | 'dashboard'
  | 'members'
  | 'memberships'
  | 'attendance'
  | 'floor-velocity'
  | 'supplements'
  | 'workout-plans'
  | 'payments'
  | 'enquiries'
  | 'settings';

// ── Form inputs (UI -> App handlers; App/backend builds the records) ──
export interface NewMemberInput {
  name: string;
  phone: string;
  email: string;
  dob?: string;
  planId: string;
  recordPayment: boolean;
  paymentMode: PaymentMode;
  biometricId?: string;
  // Timings (Morning / Evening slot)
  timingSlot?: 'MORNING' | 'EVENING' | 'BOTH';
  // Custom discount
  discountAmount?: number;
  discountType?: 'flat' | 'percentage';
  // Due / Partial payment & renewal days
  isPartialPayment?: boolean;
  amountPaidNow?: number;
  dueAmount?: number;
  customRenewalDays?: number;
  // BMI & Fitness details
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  bmiCategory?: string;
}

export interface NewPaymentInput {
  memberId: string;
  amount: number;
  paymentMode: PaymentMode;
}

// ── Supplement Store Types ──
export interface SupplementItem {
  id: string;
  name: string;
  brand: string;
  category: 'Protein' | 'Creatine' | 'Pre-Workout' | 'BCAA' | 'Vitamins' | 'Snacks' | 'Accessories';
  price: number;
  costPrice?: number;
  stock: number;
  unit: string;
  flavor?: string;
  description?: string;
  imageUrl?: string;
}

export interface SupplementSale {
  id: string;
  supplementId?: string;
  supplementName: string;
  customerName: string;
  customerPhone?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMode: 'UPI' | 'Cash' | 'Card';
  notes?: string;
  soldAt: string;
}

// ── Workout Plan Types ──
export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSec: number;
  notes?: string;
}

export interface WorkoutDay {
  id: string;
  dayName: string; // e.g. "Monday: Chest & Triceps"
  targetMuscles: string; // e.g. "Chest, Triceps, Anterior Delts"
  exercises: WorkoutExercise[];
}

export interface WorkoutPlanItem {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  daysPerWeek: number;
  goal: 'Muscle Hypertrophy' | 'Fat Loss & Conditioning' | 'Strength & Power' | 'General Fitness';
  days: WorkoutDay[];
  assignedMemberCount?: number;
  updatedAt?: string;
}


