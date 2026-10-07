import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDayIST } from '@/lib/format';
import { toCheckInRecord } from '@/lib/records';

/**
 * Biometric & Turnstile Attendance API Endpoint
 * Enables biometric devices (eSSL, ZKTeco, Mantra, Realtime) or local sync scripts
 * to push attendance punches directly into NeuraForge OS.
 *
 * Request POST /api/attendance/biometric
 * Body: { "gymSlug": "iron-gym", "identifier": "MEM-001", "timestamp"?: "2026-10-08T00:50:00Z" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gymSlug, identifier, timestamp } = body ?? {};

    if (!gymSlug || !identifier) {
      return NextResponse.json(
        { ok: false, status: 'DENIED', error: 'Missing gymSlug or identifier' },
        { status: 400 }
      );
    }

    const gym = await prisma.gym.findUnique({
      where: { slug: String(gymSlug).trim().toLowerCase() },
    });
    if (!gym) {
      return NextResponse.json(
        { ok: false, status: 'DENIED', error: 'Invalid gymSlug' },
        { status: 404 }
      );
    }

    const cleanIdentifier = String(identifier).trim();
    const member = await prisma.member.findFirst({
      where: {
        gymId: gym.id,
        OR: [
          { memberCode: { equals: cleanIdentifier, mode: 'insensitive' } },
          { phone: { equals: cleanIdentifier.replace(/\D/g, '') } },
        ],
      },
      include: {
        memberships: {
          orderBy: { expiresAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { ok: false, status: 'DENIED', error: `Member "${cleanIdentifier}" not found` },
        { status: 404 }
      );
    }

    const punchTime = timestamp ? new Date(timestamp) : new Date();
    const now = isNaN(punchTime.getTime()) ? new Date() : punchTime;

    const latest = member.memberships[0];
    if (!latest || latest.expiresAt < now) {
      return NextResponse.json(
        {
          ok: false,
          status: 'DENIED',
          error: 'Membership has expired',
          memberName: member.name,
          memberCode: member.memberCode,
        },
        { status: 403 }
      );
    }

    // Check if already present today
    const alreadyIn = await prisma.attendance.findFirst({
      where: {
        gymId: gym.id,
        memberId: member.id,
        checkedInAt: { gte: startOfDayIST(now) },
      },
    });

    if (alreadyIn) {
      return NextResponse.json({
        ok: true,
        status: 'DUPLICATE',
        message: 'Member already checked in today',
        memberName: member.name,
        memberCode: member.memberCode,
        checkIn: toCheckInRecord(alreadyIn),
      });
    }

    const row = await prisma.attendance.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        checkedInAt: now,
      },
    });

    return NextResponse.json({
      ok: true,
      status: 'GRANTED',
      message: 'Access granted',
      memberName: member.name,
      memberCode: member.memberCode,
      planName: latest.plan.name,
      checkIn: toCheckInRecord(row),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json(
      { ok: false, status: 'ERROR', error: message },
      { status: 500 }
    );
  }
}
