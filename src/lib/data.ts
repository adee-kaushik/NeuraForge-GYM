import { prisma } from '@/lib/prisma';
import { toCheckInRecord, toMemberRecord, toTransactionRecord } from '@/lib/records';
import { ensureDatabaseSchema } from '@/lib/db-init';
import type { CheckInRecord, MemberRecord, PaymentMode, PaymentStatus, TransactionRecord } from '@/types';

// Every query here is limited to one gym (gymId comes from the logged-in user, never from the browser).

export async function loadMemberRecords(gymId: string): Promise<MemberRecord[]> {
  await ensureDatabaseSchema();
  try {
    const rows = await prisma.member.findMany({
      where: { gymId },
      include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toMemberRecord);
  } catch (err) {
    console.warn('loadMemberRecords findMany failed, attempting DDL and raw fallback:', err);
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "timingSlot" TEXT DEFAULT 'MORNING';
        ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;
        ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "height" DOUBLE PRECISION;
        ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "bmi" DOUBLE PRECISION;
        ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "bmiCategory" TEXT;
      `);
      const rows = await prisma.member.findMany({
        where: { gymId },
        include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toMemberRecord);
    } catch {
      // Raw SQL fallback selecting core columns
      try {
        const raw = await prisma.$queryRawUnsafe<Array<{
          id: string;
          memberCode: string;
          name: string;
          phone: string;
          email: string | null;
          dob: Date | null;
          timingSlot?: string | null;
          weight?: number | null;
          height?: number | null;
          bmi?: number | null;
          bmiCategory?: string | null;
          authUserId: string | null;
          joinedAt: Date;
          planId?: string | null;
          expiresAt?: Date | null;
        }>>(`
          SELECT m.id, m."memberCode", m.name, m.phone, m.email, m.dob, m."authUserId", m."joinedAt",
                 ms."planId", ms."expiresAt"
          FROM "Member" m
          LEFT JOIN LATERAL (
            SELECT "planId", "expiresAt"
            FROM "Membership"
            WHERE "memberId" = m.id
            ORDER BY "expiresAt" DESC
            LIMIT 1
          ) ms ON true
          WHERE m."gymId" = $1
          ORDER BY m."createdAt" DESC
        `, gymId);

        return raw.map((r) => ({
          id: r.id,
          memberCode: r.memberCode,
          name: r.name,
          phone: r.phone,
          email: r.email ?? '',
          dob: r.dob ? new Date(r.dob).toISOString() : null,
          timingSlot: r.timingSlot || 'MORNING',
          weight: typeof r.weight === 'number' ? r.weight : null,
          height: typeof r.height === 'number' ? r.height : null,
          bmi: typeof r.bmi === 'number' ? r.bmi : null,
          bmiCategory: r.bmiCategory || null,
          planId: r.planId ?? '',
          joinedAt: new Date(r.joinedAt).toISOString(),
          expiresAt: (r.expiresAt ? new Date(r.expiresAt) : new Date(r.joinedAt)).toISOString(),
          hasLogin: r.authUserId !== null,
        }));
      } catch (finalErr) {
        console.error('All member record loading methods failed:', finalErr);
        return [];
      }
    }
  }
}

export async function loadTransactionRecords(gymId: string): Promise<TransactionRecord[]> {
  await ensureDatabaseSchema();
  try {
    const rows = await prisma.payment.findMany({
      where: { gymId },
      include: { member: true, membership: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return rows.map(toTransactionRecord);
  } catch (err) {
    console.warn('loadTransactionRecords findMany failed, attempting DDL and raw fallback:', err);
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER DEFAULT 0;
        ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "notes" TEXT;
      `);
      const rows = await prisma.payment.findMany({
        where: { gymId },
        include: { member: true, membership: { include: { plan: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      return rows.map(toTransactionRecord);
    } catch {
      // Raw SQL fallback
      try {
        const raw = await prisma.$queryRawUnsafe<Array<{
          id: string;
          memberId: string;
          amount: number;
          gstAmount: number;
          mode: PaymentMode;
          status: PaymentStatus;
          invoiceNo: string;
          discountAmount?: number | null;
          notes?: string | null;
          createdAt: Date;
          memberName: string;
          memberEmail: string | null;
          planName: string | null;
        }>>(`
          SELECT p.id, p."memberId", p.amount, p."gstAmount", p.mode, p.status, p."invoiceNo", p."createdAt",
                 m.name as "memberName", m.email as "memberEmail",
                 pl.name as "planName"
          FROM "Payment" p
          JOIN "Member" m ON m.id = p."memberId"
          LEFT JOIN "Membership" ms ON ms.id = p."membershipId"
          LEFT JOIN "Plan" pl ON pl.id = ms."planId"
          WHERE p."gymId" = $1
          ORDER BY p."createdAt" DESC
          LIMIT 500
        `, gymId);

        return raw.map((p) => ({
          id: p.id,
          memberId: p.memberId,
          memberName: p.memberName,
          memberEmail: p.memberEmail ?? '',
          planCategory: p.planName ?? 'Payment',
          amount: p.amount,
          paymentMode: p.mode,
          status: p.status,
          invoiceNo: p.invoiceNo,
          gstAmount: p.gstAmount,
          discountAmount: typeof p.discountAmount === 'number' ? p.discountAmount : 0,
          notes: p.notes ?? null,
          createdAt: new Date(p.createdAt).toISOString(),
        }));
      } catch (finalErr) {
        console.error('All transaction loading methods failed:', finalErr);
        return [];
      }
    }
  }
}

// Check-ins from the start of this month (or the last 7 days, whichever reaches further back).
// Needed for the dashboard chart and each member's "visits this month".
export async function loadCheckInRecords(gymId: string): Promise<CheckInRecord[]> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const since = monthStart < weekAgo ? monthStart : weekAgo;

    const rows = await prisma.attendance.findMany({
      where: { gymId, checkedInAt: { gte: since } },
      orderBy: { checkedInAt: 'desc' },
      take: 1000,
    });
    return rows.map(toCheckInRecord);
  } catch (err) {
    console.warn('loadCheckInRecords failed:', err);
    return [];
  }
}
