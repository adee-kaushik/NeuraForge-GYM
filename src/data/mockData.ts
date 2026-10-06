import { CheckInRecord, MemberRecord, MembershipPlan, TransactionRecord, PaymentMode, PaymentStatus } from '../types';
import { GYM } from '../config/gym';
import { addDays, addMonths, gstIncluded, startOfDay } from '../lib/format';
import { invoiceFor } from '../lib/ids';

// ─────────────────────────────────────────────────────────────
// Mock data, shaped like database rows.
// All dates are relative to "now", so the demo never goes stale.
// Replaced by Prisma queries in the backend phase.
// ─────────────────────────────────────────────────────────────

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'PLAN-VIP',
    name: 'VIP',
    durationLabel: '12 months, all perks',
    durationMonths: 12,
    price: 32000,
    originalPrice: 38000,
    features: ['All gym areas', 'Personal locker', 'Steam and sauna', '2 guest passes per month', 'Personal trainer'],
  },
  {
    id: 'PLAN-YEARLY',
    name: 'Yearly',
    durationLabel: '12 months',
    durationMonths: 12,
    price: 18500,
    originalPrice: 22000,
    popular: true,
    features: ['All gym areas', 'Free locker for 12 months', 'Monthly body check', 'Group classes'],
  },
  {
    id: 'PLAN-HALF',
    name: 'Half-Yearly',
    durationLabel: '6 months',
    durationMonths: 6,
    price: 11000,
    originalPrice: 13500,
    features: ['Cardio and weights area', 'Steam room on weekends', 'Free diet consultation'],
  },
  {
    id: 'PLAN-QUARTERLY',
    name: 'Quarterly',
    durationLabel: '3 months',
    durationMonths: 3,
    price: 6200,
    originalPrice: 7500,
    features: ['Gym floor 6:00 AM to 10:30 PM', 'Locker room and shower', 'Starter workout plan'],
  },
  {
    id: 'PLAN-MONTHLY',
    name: 'Monthly',
    durationLabel: '1 month',
    durationMonths: 1,
    price: 2500,
    features: ['Gym floor access', 'Locker for the day'],
  },
];

const planOf = (planId: string) => MEMBERSHIP_PLANS.find((p) => p.id === planId)!;

// [id, name, phone, email, planId, days until expiry (negative = already expired)]
const MEMBER_ROWS: [string, string, string, string, string, number][] = [
  ['MEM-001', 'Rohit Sharma', '+91 98201 44102', 'rohit.sharma@gmail.com', 'PLAN-YEARLY', 2],
  ['MEM-002', 'Priya Meena', '+91 97410 89230', 'priya.meena@techcorp.in', 'PLAN-HALF', 3],
  ['MEM-003', 'Aman Gupta', '+91 98862 31109', 'aman.g@outlook.com', 'PLAN-QUARTERLY', 4],
  ['MEM-004', 'Kavya Singh', '+91 99014 55421', 'kavya.singh@design.studio', 'PLAN-MONTHLY', 5],
  ['MEM-005', 'Vikramaditya Rao', '+91 94481 02938', 'vikram.rao@fintech.io', 'PLAN-QUARTERLY', 6],
  ['MEM-006', 'Arjun Nair', '+91 98450 11982', 'arjun.nair@aerospace.in', 'PLAN-YEARLY', 83],
  ['MEM-007', 'Deepa Krishnan', '+91 98801 77342', 'deepa.k@medresearch.org', 'PLAN-HALF', 109],
  ['MEM-008', 'Rahul Verma', '+91 97312 44901', 'rahul.verma@startup.co', 'PLAN-MONTHLY', 25],
  ['MEM-009', 'Sneha Patel', '+91 96118 33204', 'sneha.patel@arch.in', 'PLAN-QUARTERLY', 42],
  ['MEM-010', 'Ananya Deshmukh', '+91 99805 12384', 'ananya.d@gmail.com', 'PLAN-YEARLY', 365],
  ['MEM-011', 'Siddharth Iyer', '+91 98452 90112', 'sid.iyer@quantum.org', 'PLAN-VIP', 180],
  ['MEM-012', 'Nandini Hegde', '+91 98440 65123', 'nandini.h@cloud.net', 'PLAN-HALF', 7],
  ['MEM-013', 'Rajesh Patel', '+91 98765 21043', 'rajesh.p@yahoo.in', 'PLAN-QUARTERLY', 90],
  ['MEM-014', 'Simran Kaur', '+91 98110 67852', 'simran.k@gmail.com', 'PLAN-HALF', 180],
  ['MEM-015', 'Devendra Joshi', '+91 99290 45118', 'dev.joshi@corp.in', 'PLAN-MONTHLY', 29],
  ['MEM-016', 'Rohan Mehra', '+91 98290 33017', 'rohan.m@gmail.com', 'PLAN-YEARLY', 363],
  ['MEM-017', 'Tanvi Shrestha', '+91 97829 90461', 'tanvi.s@tech.co', 'PLAN-QUARTERLY', 88],
  ['MEM-018', 'Karan Malhotra', '+91 98280 71526', 'karan.m@gmail.com', 'PLAN-MONTHLY', -3],
];

export const createInitialMembers = (now: Date): MemberRecord[] =>
  MEMBER_ROWS.map(([id, name, phone, email, planId, daysToExpiry]) => {
    const expires = addDays(startOfDay(now), daysToExpiry);
    return {
      id,
      name,
      phone,
      email,
      planId,
      expiresAt: expires.toISOString(),
      joinedAt: addMonths(expires, -planOf(planId).durationMonths).toISOString(),
    };
  });

// Clamp to start of today so "X minutes ago" never slips into yesterday
const minutesAgo = (now: Date, minutes: number): Date =>
  new Date(Math.max(startOfDay(now).getTime(), now.getTime() - minutes * 60000));

const dayAt = (now: Date, daysAgo: number, hour: number, minute: number): Date => {
  const d = addDays(startOfDay(now), -daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const memberOf = (id: string) => MEMBER_ROWS.find((r) => r[0] === id)!;

// [txn number, memberId, planCategory, plan price, mode, status, when]
export const createInitialTransactions = (now: Date): TransactionRecord[] => {
  const rows: [number, string, string, number, PaymentMode, PaymentStatus, Date][] = [
    [9082, 'MEM-010', 'Yearly', 18500, 'UPI', 'PAID', minutesAgo(now, 25)],
    [9081, 'MEM-013', 'Quarterly', 6200, 'UPI', 'PAID', minutesAgo(now, 60)],
    [9080, 'MEM-003', 'Renewal (Quarterly)', 6200, 'Cash', 'PENDING', dayAt(now, 1, 19, 30)],
    [9079, 'MEM-014', 'Half-Yearly', 11000, 'Card', 'PAID', dayAt(now, 1, 17, 15)],
    [9078, 'MEM-015', 'Monthly', 2500, 'UPI', 'PAID', dayAt(now, 1, 14, 40)],
    [9077, 'MEM-016', 'Yearly', 18500, 'UPI', 'PAID', dayAt(now, 2, 11, 20)],
    [9076, 'MEM-017', 'Quarterly', 6200, 'Card', 'PAID', dayAt(now, 2, 9, 10)],
  ];

  return rows.map(([n, memberId, planCategory, amount, paymentMode, status, when]) => {
    const [, name, , email] = memberOf(memberId);
    const id = `#TXN-${n}`;
    return {
      id,
      memberId,
      memberName: name,
      memberEmail: email,
      planCategory,
      amount,
      paymentMode,
      status,
      invoiceNo: invoiceFor(id, now),
      gstAmount: gstIncluded(amount, GYM.gstRatePercent),
      createdAt: when.toISOString(),
    };
  });
};

export const createInitialCheckIns = (now: Date): CheckInRecord[] => {
  const out: CheckInRecord[] = [];
  let n = 1;
  const add = (memberId: string, when: Date) => {
    out.push({ id: `CHK-${String(n).padStart(3, '0')}`, memberId, checkedInAt: when.toISOString() });
    n += 1;
  };

  // Past 6 days: a rotating group of the first 12 members, morning + evening batches
  const perDay = [8, 10, 9, 11, 7, 12]; // days ago 6..1
  perDay.forEach((count, idx) => {
    const daysAgo = 6 - idx;
    for (let i = 0; i < count; i += 1) {
      const memberId = MEMBER_ROWS[(daysAgo * 3 + i) % 12][0];
      const morning = i % 2 === 0;
      const minutes = (morning ? 6 * 60 : 17 * 60) + Math.floor(i / 2) * 35;
      add(memberId, dayAt(now, daysAgo, Math.floor(minutes / 60), minutes % 60));
    }
  });

  // Today: relative to now so nothing is in the future
  const today: [string, number][] = [
    ['MEM-011', 205],
    ['MEM-005', 190],
    ['MEM-010', 85],
    ['MEM-009', 70],
    ['MEM-008', 45],
    ['MEM-007', 30],
    ['MEM-006', 15],
  ];
  today.forEach(([memberId, mins]) => add(memberId, minutesAgo(now, mins)));

  return out;
};
