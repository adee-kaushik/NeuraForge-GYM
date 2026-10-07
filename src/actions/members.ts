'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { addMonths, gstIncluded } from '@/lib/format';
import { nextId, nextInvoiceNo } from '@/lib/ids';
import { toMemberRecord, toTransactionRecord } from '@/lib/records';
import type { MemberRecord, NewMemberInput, TransactionRecord } from '@/types';

const PAYMENT_MODES = ['UPI', 'Card', 'Cash'];

export type AddMemberResult =
  | { ok: true; member: MemberRecord; payment?: TransactionRecord }
  | { ok: false; error: string };

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

  // Member code and invoice number are "max + 1"; if two requests collide, the unique
  // constraint rejects one of them and we simply try again.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const now = new Date();

        const codes = await tx.member.findMany({ where: { gymId }, select: { memberCode: true } });
        const memberCode = nextId(
          codes.map((c) => c.memberCode),
          'MEM-',
          1,
          3
        );

        const member = await tx.member.create({
          data: {
            gymId,
            memberCode,
            name,
            phone,
            email: email || null,
            joinedAt: now,
            memberships: {
              create: {
                gymId,
                planId: plan.id,
                startsAt: now,
                expiresAt: addMonths(now, plan.durationMonths),
              },
            },
          },
          include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
        });

        let payment = null;
        if (input.recordPayment) {
          const invoices = await tx.payment.findMany({ where: { gymId }, select: { invoiceNo: true } });
          payment = await tx.payment.create({
            data: {
              gymId,
              memberId: member.id,
              membershipId: member.memberships[0].id,
              amount: plan.price,
              gstAmount: gstIncluded(plan.price, staff.gym.gstRatePercent),
              mode: input.paymentMode,
              status: 'PAID',
              invoiceNo: nextInvoiceNo(
                invoices.map((i) => i.invoiceNo),
                now.getFullYear()
              ),
            },
            include: { member: true, membership: { include: { plan: true } } },
          });
        }

        return { member, payment };
      });

      return {
        ok: true,
        member: toMemberRecord(result.member),
        payment: result.payment ? toTransactionRecord(result.payment) : undefined,
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

export type UpdateMemberInput = { name: string; phone: string; email: string };
export type UpdateMemberResult = { ok: true; member: MemberRecord } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fixes a member's name, phone or email. The member code, plan and history stay as they are.
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

  // gymId in the query means a member of another gym can never be changed here
  const res = await prisma.member.updateMany({
    where: { id: memberId, gymId },
    data: { name, phone, email: email || null },
  });
  if (res.count !== 1) return { ok: false, error: 'Member not found.' };

  const row = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
  });
  if (!row) return { ok: false, error: 'Member not found.' };

  return { ok: true, member: toMemberRecord(row) };
}
