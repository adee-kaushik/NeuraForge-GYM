import type { Attendance, Member, Membership, Payment, Plan } from '@prisma/client';
import type { CheckInRecord, MemberRecord, TransactionRecord } from '@/types';

// Database rows -> the record shapes the UI works with (ISO date strings, no Date objects)

type MemberWithLatestMembership = Member & { memberships: Membership[] };

export const toMemberRecord = (m: MemberWithLatestMembership): MemberRecord => {
  const latest = m.memberships[0];
  return {
    id: m.id,
    memberCode: m.memberCode,
    name: m.name,
    phone: m.phone,
    email: m.email ?? '',
    planId: latest?.planId ?? '',
    joinedAt: m.joinedAt.toISOString(),
    expiresAt: (latest?.expiresAt ?? m.joinedAt).toISOString(),
    hasLogin: m.authUserId !== null,
  };
};

type PaymentWithRefs = Payment & {
  member: Member;
  membership: (Membership & { plan: Plan }) | null;
};

export const toTransactionRecord = (p: PaymentWithRefs): TransactionRecord => ({
  id: p.id,
  memberId: p.memberId,
  memberName: p.member.name,
  memberEmail: p.member.email ?? '',
  planCategory: p.membership?.plan.name ?? 'Payment',
  amount: p.amount,
  paymentMode: p.mode,
  status: p.status,
  invoiceNo: p.invoiceNo,
  gstAmount: p.gstAmount,
  createdAt: p.createdAt.toISOString(),
});

export const toCheckInRecord = (a: Attendance): CheckInRecord => ({
  id: a.id,
  memberId: a.memberId,
  checkedInAt: a.checkedInAt.toISOString(),
});
