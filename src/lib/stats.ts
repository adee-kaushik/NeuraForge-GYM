import { CheckInLog, Member, Transaction } from '../types';
import { addDays, isSameDay, isSameMonth, startOfDay } from './format';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface DayCount {
  label: string; // 'M', 'T' ... or 'TOD' for today
  count: number;
  isToday: boolean;
}

export interface DashboardStats {
  totalMembers: number;
  newThisMonth: number;
  activeMembers: number;
  activePercent: number;
  expiringThisWeek: number;
  expiringIn48h: number;
  pendingAmount: number;
  pendingCount: number;
  todayEntries: number;
  peakHourLabel: string | null;
  revenueThisMonth: number;
  paidCountThisMonth: number;
  goal: number;
  goalPercent: number; // 0-100
  remainingToGoal: number;
  daysLeftInMonth: number;
  last7Days: DayCount[];
}

const hourLabel = (h: number): string => {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:00 ${suffix}`;
};

export const computeDashboardStats = (
  members: Member[],
  transactions: Transaction[],
  checkIns: CheckInLog[],
  goal: number,
  now: Date
): DashboardStats => {
  const activeMembers = members.filter((m) => m.status !== 'expired').length;

  const paidThisMonth = transactions.filter((t) => t.status === 'PAID' && isSameMonth(t.createdAt, now));
  const revenueThisMonth = paidThisMonth.reduce((s, t) => s + t.amount, 0);

  const pending = transactions.filter((t) => t.status === 'PENDING');

  const today = startOfDay(now);
  const last7Days: DayCount[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const isToday = i === 6;
    return {
      label: isToday ? 'TOD' : DAY_LETTERS[day.getDay()],
      count: checkIns.filter((c) => isSameDay(c.checkedInAt, day)).length,
      isToday,
    };
  });

  // Busiest hour across the last 7 days of check-ins
  const byHour = new Array(24).fill(0) as number[];
  checkIns.forEach((c) => {
    byHour[new Date(c.checkedInAt).getHours()] += 1;
  });
  const maxCount = Math.max(...byHour);
  const peakHour = maxCount > 0 ? byHour.indexOf(maxCount) : -1;

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    totalMembers: members.length,
    newThisMonth: members.filter((m) => isSameMonth(m.joinedAt, now)).length,
    activeMembers,
    activePercent: members.length ? Math.round((activeMembers / members.length) * 100) : 0,
    expiringThisWeek: members.filter((m) => m.status === 'expiring').length,
    expiringIn48h: members.filter((m) => m.daysLeft >= 0 && m.daysLeft <= 2).length,
    pendingAmount: pending.reduce((s, t) => s + t.amount, 0),
    pendingCount: pending.length,
    todayEntries: last7Days[6].count,
    peakHourLabel: peakHour >= 0 ? `${hourLabel(peakHour)} - ${hourLabel((peakHour + 1) % 24)}` : null,
    revenueThisMonth,
    paidCountThisMonth: paidThisMonth.length,
    goal,
    goalPercent: goal > 0 ? Math.min(100, Math.round((revenueThisMonth / goal) * 1000) / 10) : 0,
    remainingToGoal: Math.max(0, goal - revenueThisMonth),
    daysLeftInMonth: endOfMonth.getDate() - now.getDate(),
    last7Days,
  };
};
