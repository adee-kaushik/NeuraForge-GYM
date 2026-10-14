'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { addMonths, gstIncluded } from '@/lib/format';
import { nextId, nextInvoiceNo } from '@/lib/ids';
import { toMemberRecord, toTransactionRecord } from '@/lib/records';
import type { MemberRecord, NewMemberInput, PaymentMode, TransactionRecord } from '@/types';

const PAYMENT_MODES = ['UPI', 'Card', 'Cash'];

export type AddMemberResult =
  | { ok: true; member: MemberRecord; payment?: TransactionRecord; duePayment?: TransactionRecord }
  | { ok: false; error: string };

let memberColumnsChecked = false;
async function ensureMemberColumnsSafe() {
  if (memberColumnsChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "timingSlot" TEXT DEFAULT 'MORNING';
      ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;
      ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "height" DOUBLE PRECISION;
      ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "bmi" DOUBLE PRECISION;
      ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "bmiCategory" TEXT;
      ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER DEFAULT 0;
      ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "notes" TEXT;
    `);
    memberColumnsChecked = true;
  } catch {
    memberColumnsChecked = true;
  }
}

export async function addMember(input: NewMemberInput): Promise<AddMemberResult> {
  const staff = await requireStaff();
  const gymId = staff.gymId;

  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();

  if (!name) return { ok: false, error: 'Member name is required.' };
  if (phone.replace(/\D/g, '').length < 10) return { ok: false, error: 'Enter a valid phone number.' };
  if (!PAYMENT_MODES.includes(input.paymentMode)) return { ok: false, error: 'Invalid payment mode.' };

  // The plan must belong to this gym
  const plan = await prisma.plan.findFirst({ where: { id: input.planId, gymId, isActive: true } });
  if (!plan) return { ok: false, error: 'The selected plan was not found.' };

  await ensureMemberColumnsSafe();

  const discountAmount = Math.max(0, Math.min(plan.price, Math.round(input.discountAmount || 0)));
  const effectivePrice = Math.max(0, plan.price - discountAmount);

  // Member code and invoice number are "max + 1"; if two requests collide, the unique
  // constraint rejects one of them and we simply try again.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const now = new Date();

        let memberCode = input.biometricId?.trim().toUpperCase();
        if (memberCode) {
          const existing = await tx.member.findFirst({ where: { gymId, memberCode } });
          if (existing) {
            throw new Error(`Biometric / Member Code "${memberCode}" is already in use by another member.`);
          }
        } else {
          const codes = await tx.member.findMany({
            where: { gymId, memberCode: { startsWith: 'MEM-' } },
            select: { memberCode: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
          });
          memberCode = nextId(
            codes.map((c) => c.memberCode),
            'MEM-',
            1,
            3
          );
        }

        // Calculate membership expiry: custom renewal days or plan duration
        const customDays = input.customRenewalDays && input.customRenewalDays > 0 ? input.customRenewalDays : null;
        const expiresAt = customDays
          ? new Date(now.getTime() + customDays * 24 * 60 * 60 * 1000)
          : addMonths(now, plan.durationMonths);

        let member;
        try {
          member = await tx.member.create({
            data: {
              gymId,
              memberCode,
              name,
              phone,
              email: email || null,
              dob: input.dob && input.dob.trim() ? new Date(input.dob.trim()) : null,
              timingSlot: input.timingSlot || 'MORNING',
              weight: typeof input.weight === 'number' && input.weight > 0 ? input.weight : null,
              height: typeof input.height === 'number' && input.height > 0 ? input.height : null,
              bmi: typeof input.bmi === 'number' && input.bmi > 0 ? input.bmi : null,
              bmiCategory: input.bmiCategory?.trim() || null,
              joinedAt: now,
              memberships: {
                create: {
                  gymId,
                  planId: plan.id,
                  startsAt: now,
                  expiresAt,
                },
              },
            },
            include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
          });
        } catch {
          // Graceful fallback if new columns are pending in DB
          member = await tx.member.create({
            data: {
              gymId,
              memberCode,
              name,
              phone,
              email: email || null,
              dob: input.dob && input.dob.trim() ? new Date(input.dob.trim()) : null,
              joinedAt: now,
              memberships: {
                create: {
                  gymId,
                  planId: plan.id,
                  startsAt: now,
                  expiresAt,
                },
              },
            },
            include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
          });
        }

        let payment = null;
        let duePayment = null;

        if (input.isPartialPayment) {
          const paidNow = Math.max(0, Math.min(effectivePrice, Math.round(input.amountPaidNow ?? 0)));
          const due = Math.max(0, effectivePrice - paidNow);

          const invoices = await tx.payment.findMany({ where: { gymId }, select: { invoiceNo: true } });
          const invoiceList = invoices.map((i) => i.invoiceNo);

          if (paidNow > 0) {
            const invNo = nextInvoiceNo(invoiceList, now.getFullYear());
            invoiceList.push(invNo);
            payment = await tx.payment.create({
              data: {
                gymId,
                memberId: member.id,
                membershipId: member.memberships[0].id,
                amount: paidNow,
                gstAmount: gstIncluded(paidNow, staff.gym.gstRatePercent),
                mode: input.paymentMode,
                status: 'PAID',
                invoiceNo: invNo,
                discountAmount,
                notes: `Partial admission fee (Total: ₹${effectivePrice}, Paid: ₹${paidNow}, Due: ₹${due})`,
              },
              include: { member: true, membership: { include: { plan: true } } },
            });
          }

          if (due > 0) {
            const dueInvNo = nextInvoiceNo(invoiceList, now.getFullYear());
            invoiceList.push(dueInvNo);
            duePayment = await tx.payment.create({
              data: {
                gymId,
                memberId: member.id,
                membershipId: member.memberships[0].id,
                amount: due,
                gstAmount: gstIncluded(due, staff.gym.gstRatePercent),
                mode: input.paymentMode,
                status: 'PENDING',
                invoiceNo: dueInvNo,
                discountAmount: 0,
                notes: `Pending due payment balance (${customDays ? `${customDays} days valid` : `${plan.durationMonths} months`})`,
              },
              include: { member: true, membership: { include: { plan: true } } },
            });
          }
        } else if (input.recordPayment) {
          const invoices = await tx.payment.findMany({ where: { gymId }, select: { invoiceNo: true } });
          payment = await tx.payment.create({
            data: {
              gymId,
              memberId: member.id,
              membershipId: member.memberships[0].id,
              amount: effectivePrice,
              gstAmount: gstIncluded(effectivePrice, staff.gym.gstRatePercent),
              mode: input.paymentMode,
              status: 'PAID',
              invoiceNo: nextInvoiceNo(
                invoices.map((i) => i.invoiceNo),
                now.getFullYear()
              ),
              discountAmount,
              notes: discountAmount > 0 ? `Discount ₹${discountAmount} applied on ₹${plan.price} plan` : null,
            },
            include: { member: true, membership: { include: { plan: true } } },
          });
        }

        return { member, payment, duePayment };
      });

      return {
        ok: true,
        member: toMemberRecord(result.member),
        payment: result.payment ? toTransactionRecord(result.payment) : undefined,
        duePayment: result.duePayment ? toTransactionRecord(result.duePayment) : undefined,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      return { ok: false, error: 'Could not add the member. Please try again.' };
    }
  }

  return { ok: false, error: 'Could not add the member. Please try again.' };
}

export type RenewResult = { ok: true; expiresAt: string } | { ok: false; error: string };

export async function renewMembership(memberId: string): Promise<RenewResult> {
  const staff = await requireStaff();

  // gymId in the query means a member of another gym can never be found here
  const latest = await prisma.membership.findFirst({
    where: { memberId, gymId: staff.gymId },
    orderBy: { expiresAt: 'desc' },
    include: { plan: true },
  });
  if (!latest) return { ok: false, error: 'Member not found.' };

  // Renew from the later of today and the current expiry, so early renewals don't lose days
  const now = new Date();
  const start = latest.expiresAt > now ? latest.expiresAt : now;

  const created = await prisma.membership.create({
    data: {
      gymId: staff.gymId,
      memberId,
      planId: latest.planId,
      startsAt: start,
      expiresAt: addMonths(start, latest.plan.durationMonths),
    },
  });

  return { ok: true, expiresAt: created.expiresAt.toISOString() };
}

export type RenewWithDueInput = {
  memberId: string;
  planId?: string;
  customRenewalDays?: number;
  discountAmount?: number;
  isPartialPayment?: boolean;
  amountPaidNow?: number;
  dueAmount?: number;
  paymentMode?: PaymentMode;
};

export type RenewWithDueResult =
  | { ok: true; expiresAt: string; paidPayment?: TransactionRecord; duePayment?: TransactionRecord }
  | { ok: false; error: string };

export async function renewMembershipWithDue(input: RenewWithDueInput): Promise<RenewWithDueResult> {
  const staff = await requireStaff();
  const gymId = staff.gymId;

  await ensureMemberColumnsSafe();

  const member = await prisma.member.findFirst({
    where: { id: input.memberId, gymId },
    include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1, include: { plan: true } } },
  });
  if (!member) return { ok: false, error: 'Member not found.' };

  const latest = member.memberships[0];
  const targetPlanId = input.planId || latest?.planId;
  const plan = await prisma.plan.findFirst({ where: { id: targetPlanId, gymId, isActive: true } });
  if (!plan) return { ok: false, error: 'Plan not found.' };

  const now = new Date();
  const start = latest && latest.expiresAt > now ? latest.expiresAt : now;

  const customDays = input.customRenewalDays && input.customRenewalDays > 0 ? input.customRenewalDays : null;
  const expiresAt = customDays
    ? new Date(start.getTime() + customDays * 24 * 60 * 60 * 1000)
    : addMonths(start, plan.durationMonths);

  const discountAmount = Math.max(0, Math.min(plan.price, Math.round(input.discountAmount || 0)));
  const effectivePrice = Math.max(0, plan.price - discountAmount);
  const paymentMode = input.paymentMode || 'UPI';

  const newMembership = await prisma.membership.create({
    data: {
      gymId,
      memberId: member.id,
      planId: plan.id,
      startsAt: start,
      expiresAt,
    },
  });

  let paidPayment: TransactionRecord | undefined = undefined;
  let duePayment: TransactionRecord | undefined = undefined;

  if (input.isPartialPayment) {
    const paidNow = Math.max(0, Math.min(effectivePrice, Math.round(input.amountPaidNow ?? 0)));
    const due = Math.max(0, effectivePrice - paidNow);

    const invoices = await prisma.payment.findMany({ where: { gymId }, select: { invoiceNo: true } });
    const invoiceList = invoices.map((i) => i.invoiceNo);

    if (paidNow > 0) {
      const invNo = nextInvoiceNo(invoiceList, now.getFullYear());
      invoiceList.push(invNo);
      const p = await prisma.payment.create({
        data: {
          gymId,
          memberId: member.id,
          membershipId: newMembership.id,
          amount: paidNow,
          gstAmount: gstIncluded(paidNow, staff.gym.gstRatePercent),
          mode: paymentMode,
          status: 'PAID',
          invoiceNo: invNo,
          discountAmount,
          notes: `Partial renewal payment (${customDays ? `${customDays} days renewal` : `${plan.durationMonths} months`})`,
        },
        include: { member: true, membership: { include: { plan: true } } },
      });
      paidPayment = toTransactionRecord(p);
    }

    if (due > 0) {
      const dueInvNo = nextInvoiceNo(invoiceList, now.getFullYear());
      invoiceList.push(dueInvNo);
      const dp = await prisma.payment.create({
        data: {
          gymId,
          memberId: member.id,
          membershipId: newMembership.id,
          amount: due,
          gstAmount: gstIncluded(due, staff.gym.gstRatePercent),
          mode: paymentMode,
          status: 'PENDING',
          invoiceNo: dueInvNo,
          discountAmount: 0,
          notes: `Renewal remaining due balance (Due within ${customDays ?? 30} days)`,
        },
        include: { member: true, membership: { include: { plan: true } } },
      });
      duePayment = toTransactionRecord(dp);
    }
  } else {
    // Full payment
    const invoices = await prisma.payment.findMany({ where: { gymId }, select: { invoiceNo: true } });
    const invNo = nextInvoiceNo(invoices.map((i) => i.invoiceNo), now.getFullYear());
    const p = await prisma.payment.create({
      data: {
        gymId,
        memberId: member.id,
        membershipId: newMembership.id,
        amount: effectivePrice,
        gstAmount: gstIncluded(effectivePrice, staff.gym.gstRatePercent),
        mode: paymentMode,
        status: 'PAID',
        invoiceNo: invNo,
        discountAmount,
        notes: discountAmount > 0 ? `Renewal discount ₹${discountAmount}` : 'Renewal payment',
      },
      include: { member: true, membership: { include: { plan: true } } },
    });
    paidPayment = toTransactionRecord(p);
  }

  return {
    ok: true,
    expiresAt: expiresAt.toISOString(),
    paidPayment,
    duePayment,
  };
}

export type ExtendMembershipResult = { ok: true; expiresAt: string } | { ok: false; error: string };

export async function extendMembership(memberId: string, days: number): Promise<ExtendMembershipResult> {
  const staff = await requireStaff();

  if (!Number.isInteger(days) || days <= 0 || days > 365) {
    return { ok: false, error: 'Extension must be between 1 and 365 days.' };
  }

  const latest = await prisma.membership.findFirst({
    where: { memberId, gymId: staff.gymId },
    orderBy: { expiresAt: 'desc' },
  });
  if (!latest) return { ok: false, error: 'No membership record found.' };

  const now = new Date();
  const baseDate = latest.expiresAt > now ? latest.expiresAt : now;
  const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  const updated = await prisma.membership.update({
    where: { id: latest.id },
    data: { expiresAt: newExpiresAt },
  });

  return { ok: true, expiresAt: updated.expiresAt.toISOString() };
}

export type UpdateMemberInput = {
  name: string;
  phone: string;
  email: string;
  dob?: string | null;
  timingSlot?: 'MORNING' | 'EVENING' | 'BOTH' | string | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  bmiCategory?: string | null;
};
export type UpdateMemberResult = { ok: true; member: MemberRecord } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fixes a member's name, phone, email, DOB, slot, or BMI.
export async function updateMember(memberId: string, input: UpdateMemberInput): Promise<UpdateMemberResult> {
  const staff = await requireStaff();
  const gymId = staff.gymId;

  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const phoneDigits = phone.replace(/\D/g, '');

  if (!name || name.length > 80) return { ok: false, error: 'Name must be 1 to 80 characters.' };
  if (phoneDigits.length < 10 || phoneDigits.length > 15) return { ok: false, error: 'Enter a valid phone number.' };
  if (email && (email.length > 120 || !EMAIL_RE.test(email))) return { ok: false, error: 'Enter a valid email or leave it empty.' };

  let parsedDob: Date | null | undefined = undefined;
  if (input.dob !== undefined) {
    parsedDob = input.dob && input.dob.trim() ? new Date(input.dob.trim()) : null;
  }

  await ensureMemberColumnsSafe();

  const updateData: Record<string, unknown> = {
    name,
    phone,
    email: email || null,
    ...(parsedDob !== undefined ? { dob: parsedDob } : {}),
    ...(input.timingSlot !== undefined ? { timingSlot: input.timingSlot } : {}),
    ...(input.weight !== undefined ? { weight: input.weight } : {}),
    ...(input.height !== undefined ? { height: input.height } : {}),
    ...(input.bmi !== undefined ? { bmi: input.bmi } : {}),
    ...(input.bmiCategory !== undefined ? { bmiCategory: input.bmiCategory } : {}),
  };

  try {
    const res = await prisma.member.updateMany({
      where: { id: memberId, gymId },
      data: updateData,
    });
    if (res.count !== 1) return { ok: false, error: 'Member not found.' };
  } catch {
    // Fallback if columns not migrated
    const res = await prisma.member.updateMany({
      where: { id: memberId, gymId },
      data: {
        name,
        phone,
        email: email || null,
        ...(parsedDob !== undefined ? { dob: parsedDob } : {}),
      },
    });
    if (res.count !== 1) return { ok: false, error: 'Member not found.' };
  }

  const row = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
  });
  if (!row) return { ok: false, error: 'Member not found.' };

  return { ok: true, member: toMemberRecord(row) };
}
