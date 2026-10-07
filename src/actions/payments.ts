'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { gstIncluded } from '@/lib/format';
import { nextInvoiceNo } from '@/lib/ids';
import { toTransactionRecord } from '@/lib/records';
import type { NewPaymentInput, TransactionRecord } from '@/types';

const PAYMENT_MODES = ['UPI', 'Card', 'Cash'];

export async function markPaymentPaid(paymentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const staff = await requireStaff();

  const res = await prisma.payment.updateMany({
    where: { id: paymentId, gymId: staff.gymId, status: 'PENDING' },
    data: { status: 'PAID' },
  });

  return res.count === 1 ? { ok: true } : { ok: false, error: 'Payment not found or already paid.' };
}

export type RecordPaymentResult = { ok: true; payment: TransactionRecord } | { ok: false; error: string };

export async function recordPayment(input: NewPaymentInput): Promise<RecordPaymentResult> {
  const staff = await requireStaff();
  const gymId = staff.gymId;

  if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > 10_000_000) {
    return { ok: false, error: 'Enter a valid amount.' };
  }
  if (!PAYMENT_MODES.includes(input.paymentMode)) return { ok: false, error: 'Invalid payment mode.' };

  const member = await prisma.member.findFirst({
    where: { id: input.memberId, gymId },
    include: { memberships: { orderBy: { expiresAt: 'desc' }, take: 1 } },
  });
  if (!member) return { ok: false, error: 'Member not found.' };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const now = new Date();
      const invoices = await prisma.payment.findMany({ where: { gymId }, select: { invoiceNo: true } });

      const payment = await prisma.payment.create({
        data: {
          gymId,
          memberId: member.id,
          membershipId: member.memberships[0]?.id ?? null,
          amount: input.amount,
          gstAmount: gstIncluded(input.amount, staff.gym.gstRatePercent),
          mode: input.paymentMode,
          status: 'PAID',
          invoiceNo: nextInvoiceNo(
            invoices.map((i) => i.invoiceNo),
            now.getFullYear()
          ),
        },
        include: { member: true, membership: { include: { plan: true } } },
      });

      return { ok: true, payment: toTransactionRecord(payment) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      return { ok: false, error: 'Could not record the payment. Please try again.' };
    }
  }

  return { ok: false, error: 'Could not record the payment. Please try again.' };
}
