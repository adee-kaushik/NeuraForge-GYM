import {
  CheckInLog,
  CheckInRecord,
  Member,
  MemberRecord,
  MemberStatus,
  MembershipPlan,
  Transaction,
  TransactionRecord,
} from '../types';
import { daysUntil, formatDate, formatTime, formatTimestamp, isSameMonth } from './format';

export const EXPIRING_WITHIN_DAYS = 7;

export const statusFromDaysLeft = (daysLeft: number): MemberStatus =>
  daysLeft < 0 ? 'expired' : daysLeft <= EXPIRING_WITHIN_DAYS ? 'expiring' : 'active';

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'M';

export const toTransactions = (records: TransactionRecord[], now: Date): Transaction[] =>
  records.map((r) => ({ ...r, timestamp: formatTimestamp(r.createdAt, now) }));

export const toMembers = (
  records: MemberRecord[],
  plans: MembershipPlan[],
  checkIns: CheckInRecord[],
  transactions: TransactionRecord[],
  now: Date
): Member[] =>
  records.map((r) => {
    const plan = plans.find((p) => p.id === r.planId);
    const daysLeft = daysUntil(r.expiresAt, now);

    const visits = checkIns
      .filter((c) => c.memberId === r.id)
      .sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));

    const pending = transactions
      .filter((t) => t.memberId === r.id && t.status === 'PENDING')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      ...r,
      planName: plan?.name ?? 'Unknown plan',
      planDuration: plan?.name ?? 'Unknown plan',
      expiryDate: formatDate(r.expiresAt),
      joinDate: formatDate(r.joinedAt),
      daysLeft,
      status: statusFromDaysLeft(daysLeft),
      avatarInitials: initialsOf(r.name),
      attendanceCountThisMonth: visits.filter((v) => isSameMonth(v.checkedInAt, now)).length,
      lastCheckIn: visits[0] ? formatTimestamp(visits[0].checkedInAt, now) : undefined,
      pendingDue: pending > 0 ? pending : undefined,
    };
  });

export const toCheckInLogs = (records: CheckInRecord[], members: Member[]): CheckInLog[] =>
  [...records]
    .sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))
    .map((r) => {
      const m = members.find((x) => x.id === r.memberId);
      return {
        ...r,
        memberName: m?.name ?? 'Unknown member',
        planDuration: m?.planDuration ?? '-',
        time: formatTime(r.checkedInAt),
      };
    });
