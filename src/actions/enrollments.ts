'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db-init';
import { nextBiometricId } from '@/lib/biometric';
import { addMonths, gstIncluded } from '@/lib/format';
import { nextId, nextInvoiceNo } from '@/lib/ids';
import type { EnrollmentRecord, MembershipPlan } from '@/types';

export interface PublicGymJoinInfo {
  gym: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    upiId: string | null;
    paymentQrUrl: string | null;
  };
  plans: MembershipPlan[];
}

// 1. Get gym info for public join page (accessible without login)
export async function getPublicGymJoinInfo(
  slug: string
): Promise<{ ok: true; data: PublicGymJoinInfo } | { ok: false; error: string }> {
  try {
    await ensureDatabaseSchema();
    const cleanSlug = String(slug).trim().toLowerCase();
    const gym = await prisma.gym.findUnique({
      where: { slug: cleanSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        upiId: true,
        paymentQrUrl: true,
      },
    });

    if (!gym) {
      return { ok: false, error: `Gym code "${slug}" not found.` };
    }

    const plans = await prisma.plan.findMany({
      where: { gymId: gym.id, isActive: true },
      orderBy: { price: 'asc' },
    });

    const formattedPlans: MembershipPlan[] = plans.map((p) => ({
      id: p.id,
      name: p.name,
      durationLabel: `${p.durationMonths} ${p.durationMonths === 1 ? 'Month' : 'Months'}`,
      durationMonths: p.durationMonths,
      price: p.price,
      originalPrice: p.originalPrice || undefined,
      features: p.features || [],
      popular: p.popular,
    }));

    return {
      ok: true,
      data: {
        gym,
        plans: formattedPlans,
      },
    };
  } catch (err) {
    console.error('getPublicGymJoinInfo error:', err);
    return { ok: false, error: 'Failed to load gym details.' };
  }
}

// 2. Submit self-enrollment from public join page
export interface SubmitSelfEnrollmentInput {
  gymSlug: string;
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  dob?: string;
  planId: string;
  timingSlot?: 'MORNING' | 'EVENING' | 'BOTH';
  weight?: number;
  height?: number;
  bmi?: number;
  bmiCategory?: string;
  utrNumber?: string;
  notes?: string;
}

export async function submitSelfEnrollment(
  input: SubmitSelfEnrollmentInput
): Promise<{ ok: true; enrollmentId: string } | { ok: false; error: string }> {
  try {
    await ensureDatabaseSchema();
    const cleanSlug = String(input.gymSlug).trim().toLowerCase();
    const gym = await prisma.gym.findUnique({ where: { slug: cleanSlug } });
    if (!gym) return { ok: false, error: 'Invalid gym code.' };

    const name = input.name.trim();
    const cleanPhone = input.phone.replace(/\D/g, '');
    if (!name) return { ok: false, error: 'Please enter your full name.' };
    if (cleanPhone.length < 10) return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };

    const plan = await prisma.plan.findFirst({
      where: { id: input.planId, gymId: gym.id, isActive: true },
    });
    if (!plan) return { ok: false, error: 'Selected plan is no longer active.' };

    // Create Enrollment row
    const enrollment = await prisma.enrollment.create({
      data: {
        gymId: gym.id,
        name,
        phone: cleanPhone,
        email: input.email?.trim() || null,
        gender: input.gender || null,
        dob: input.dob && input.dob.trim() ? new Date(input.dob.trim()) : null,
        planId: plan.id,
        planName: plan.name,
        timingSlot: input.timingSlot || 'MORNING',
        weight: input.weight || null,
        height: input.height || null,
        bmi: input.bmi || null,
        bmiCategory: input.bmiCategory || null,
        amount: plan.price,
        utrNumber: input.utrNumber?.trim() || null,
        paymentStatus: input.utrNumber?.trim() ? 'PAID_PENDING_VERIFICATION' : 'UNPAID',
        status: 'PENDING',
        notes: input.notes?.trim() || null,
      },
    });

    // Notify gym staff via in-app reminder
    await prisma.gymReminder
      .create({
        data: {
          gymId: gym.id,
          title: `Front Desk Self-Enrollment: ${name}`,
          message: `${name} (${cleanPhone}) self-enrolled for ${plan.name} (₹${plan.price}) via Front Desk QR.${
            input.utrNumber ? ` UPI UTR: ${input.utrNumber}` : ''
          } Tap to approve & activate biometric pass.`,
          type: 'GENERAL',
        },
      })
      .catch(() => null);

    return { ok: true, enrollmentId: enrollment.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit registration.';
    console.error('submitSelfEnrollment error:', err);
    return { ok: false, error: 'Could not process enrollment. Please refresh and try again.' };
  }
}

// 3. Get pending self-enrollments for staff/owner
export async function getPendingEnrollments(): Promise<EnrollmentRecord[]> {
  try {
    const staff = await requireStaff();
    await ensureDatabaseSchema();

    const rows = await prisma.enrollment.findMany({
      where: { gymId: staff.gymId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      gymId: r.gymId,
      name: r.name,
      phone: r.phone,
      email: r.email,
      gender: r.gender,
      dob: r.dob ? r.dob.toISOString().split('T')[0] : null,
      planId: r.planId,
      planName: r.planName,
      timingSlot: r.timingSlot,
      weight: r.weight,
      height: r.height,
      bmi: r.bmi,
      bmiCategory: r.bmiCategory,
      amount: r.amount,
      utrNumber: r.utrNumber,
      paymentStatus: r.paymentStatus,
      status: r.status as 'PENDING' | 'APPROVED' | 'REJECTED',
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error('getPendingEnrollments error:', err);
    return [];
  }
}

// 4. Approve candidate self-enrollment (Staff & Owner)
export async function approveEnrollment(
  enrollmentId: string,
  customMemberCode?: string,
  paymentVerified = false
): Promise<{ ok: true; memberId: string; memberName: string; memberCode: string } | { ok: false; error: string }> {
  try {
    const staff = await requireStaff();
    const gymId = staff.gymId;
    await ensureDatabaseSchema();

    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, gymId, status: 'PENDING' },
    });
    if (!enrollment) return { ok: false, error: 'Enrollment not found or already processed.' };

    const plan = await prisma.plan.findFirst({
      where: { id: enrollment.planId, gymId },
    });
    if (!plan) return { ok: false, error: 'Associated membership plan not found.' };

    const now = new Date();

    // Determine Member Code
    let memberCode = customMemberCode?.trim().toUpperCase();
    if (memberCode) {
      const existing = await prisma.member.findFirst({ where: { gymId, memberCode } });
      if (existing) {
        return { ok: false, error: `Member Code "${memberCode}" is already taken.` };
      }
    } else {
      const existingCodes = await prisma.member.findMany({
        where: { gymId, memberCode: { startsWith: 'MEM-' } },
        select: { memberCode: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      memberCode = nextId(
        existingCodes.map((c) => c.memberCode),
        'MEM-',
        1,
        3
      );
    }

    const expiresAt = addMonths(now, plan.durationMonths);

    // Create Member, Membership, Payment, and update Enrollment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Claim once inside the same transaction; concurrent approvals cannot create two members.
      const claimed = await tx.enrollment.updateMany({
        where: { id: enrollment.id, gymId, status: 'PENDING' },
        data: { status: 'APPROVED', ...(paymentVerified ? { paymentStatus: 'PAID' } : {}) },
      });
      if (claimed.count !== 1) throw new Error('Enrollment already processed.');
      const biometricId = await nextBiometricId(tx, gymId);
      const member = await tx.member.create({
        data: {
          gymId,
          memberCode,
          biometricId,
          name: enrollment.name,
          phone: enrollment.phone,
          email: enrollment.email,
          dob: enrollment.dob,
          timingSlot: enrollment.timingSlot || 'MORNING',
          weight: enrollment.weight,
          height: enrollment.height,
          bmi: enrollment.bmi,
          bmiCategory: enrollment.bmiCategory,
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
        include: { memberships: true },
      });

      const membership = member.memberships[0];

      // Next invoice number
      const invoices = await tx.payment.findMany({
        where: { gymId, invoiceNo: { startsWith: `INV-${now.getFullYear()}-` } },
        select: { invoiceNo: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      const invoiceNo = nextInvoiceNo(
        invoices.map((i) => i.invoiceNo),
        now.getFullYear()
      );

      await tx.payment.create({
        data: {
          gymId,
          memberId: member.id,
          membershipId: membership.id,
          amount: enrollment.amount,
          gstAmount: gstIncluded(enrollment.amount, staff.gym.gstRatePercent),
          mode: enrollment.utrNumber ? 'UPI' : 'Cash',
          status: paymentVerified === true ? 'PAID' : 'PENDING',
          invoiceNo,
          notes: enrollment.utrNumber
            ? `Self-enrolled via Front Desk QR (UTR: ${enrollment.utrNumber})`
            : 'Self-enrolled via Front Desk QR',
        },
      });

      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'APPROVED' },
      });

      return member;
    });

    return {
      ok: true,
      memberId: result.id,
      memberName: result.name,
      memberCode: result.memberCode,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to approve enrollment.';
    console.error('approveEnrollment error:', err);
    return { ok: false, error: 'Could not process enrollment. Please refresh and try again.' };
  }
}

// 5. Reject enrollment
export async function rejectEnrollment(
  enrollmentId: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const staff = await requireStaff();
    await prisma.enrollment.updateMany({
      where: { id: enrollmentId, gymId: staff.gymId, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        notes: reason || 'Rejected by gym management',
      },
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reject enrollment.';
    return { ok: false, error: 'Could not process enrollment. Please refresh and try again.' };
  }
}
