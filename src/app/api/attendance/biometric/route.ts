import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDayIST } from '@/lib/format';
import { toCheckInRecord } from '@/lib/records';

/**
 * Universal Biometric & Turnstile Attendance API Endpoint
 * Supports:
 * 1. Standard JSON payload (used by Cloud terminals, Python/Node desktop agents, HTTP webhooks)
 * 2. Native ZKTeco / eSSL ADMS protocol (table=ATTLOG push)
 * 3. Query string auth or Header auth (?apiKey=... or x-api-key / Bearer)
 *
 * GET /api/attendance/biometric -> ADMS handshake or Device Ping
 * POST /api/attendance/biometric -> Punch check-in
 */

export async function GET(req: NextRequest) {
  const sn = req.nextUrl.searchParams.get('SN') || req.nextUrl.searchParams.get('sn');

  // ADMS / iClock handshake response
  if (sn) {
    const configResponse = [
      `GET OPTION FROM: ${sn}`,
      'ServerVersion=3.0.1',
      'ServerName=NeuraFitness',
      'PushVersion=3.0.1',
      'ErrorDelay=60',
      'RequestDelay=5',
      'TransTimes=00:00;14:00',
      'TransInterval=1',
      'TransFlag=TransData AttLog',
      'TimeZone=5.5',
      'Realtime=1',
      'Encrypt=0',
      '',
    ].join('\n');

    return new NextResponse(configResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({
    ok: true,
    service: 'NeuraFitness Biometric Attendance Gateway',
    protocols: ['JSON', 'ZKTeco/eSSL ADMS', 'Desktop-Bridge'],
    version: '1.2.0',
    status: 'ONLINE',
  });
}

export async function POST(req: NextRequest) {
  try {
    const configuredKey = process.env.BIOMETRIC_API_KEY;
    if (configuredKey) {
      const authHeader = req.headers.get('authorization') || '';
      const apiKeyHeader = req.headers.get('x-api-key') || '';
      const queryKey = req.nextUrl.searchParams.get('apiKey') || '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : apiKeyHeader.trim() || queryKey.trim();

      if (token !== configuredKey) {
        return NextResponse.json(
          { ok: false, status: 'DENIED', error: 'Unauthorized: Invalid or missing API key' },
          { status: 401 }
        );
      }
    }

    const table = req.nextUrl.searchParams.get('table') || '';
    const sn = req.nextUrl.searchParams.get('SN') || req.nextUrl.searchParams.get('sn') || '';
    const queryGymSlug = req.nextUrl.searchParams.get('gymSlug') || '';

    let gymSlug = queryGymSlug;
    let identifier = '';
    let timestamp: Date | undefined;

    const contentType = req.headers.get('content-type') || '';

    // CASE 1: Native ZKTeco / eSSL ADMS attendance log push
    if (table.toUpperCase() === 'ATTLOG' || !contentType.includes('application/json')) {
      const rawText = await req.text();
      // Formats: PIN \t Time \t Status ...
      const firstLine = rawText.split(/\r?\n/).find((line) => line.trim().length > 0);
      if (firstLine) {
        const parts = firstLine.split(/\t|,|\s{2,}/);
        if (parts.length >= 2) {
          identifier = parts[0].trim();
          const parsedDate = new Date(parts[1].trim());
          if (!isNaN(parsedDate.getTime())) timestamp = parsedDate;
        }
      }
    } else {
      // CASE 2: Standard JSON Payload
      const body = await req.json().catch(() => ({}));
      gymSlug = body.gymSlug || queryGymSlug;
      identifier = body.identifier;
      if (body.timestamp) {
        const parsedDate = new Date(body.timestamp);
        if (!isNaN(parsedDate.getTime())) timestamp = parsedDate;
      }
    }

    if (!identifier) {
      // If ADMS handshake ping with no logs, respond OK
      if (sn) {
        return new NextResponse('OK: 0\n', { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
      return NextResponse.json(
        { ok: false, status: 'DENIED', error: 'Missing member identifier / PIN' },
        { status: 400 }
      );
    }

    // Determine target Gym:
    let gym = null;
    if (gymSlug) {
      gym = await prisma.gym.findUnique({
        where: { slug: String(gymSlug).trim().toLowerCase() },
      });
    } else {
      // Security: Only fallback if there is strictly 1 gym registered in the system
      const gymCount = await prisma.gym.count();
      if (gymCount === 1) {
        gym = await prisma.gym.findFirst();
      } else {
        return NextResponse.json(
          { ok: false, status: 'DENIED', error: 'Ambiguous request: gymSlug required in multi-tenant SaaS.' },
          { status: 400 }
        );
      }
    }

    if (!gym) {
      return NextResponse.json(
        { ok: false, status: 'DENIED', error: `Gym code "${gymSlug}" not found.` },
        { status: 404 }
      );
    }

    const cleanIdentifier = String(identifier).trim();
    const cleanPhoneDigits = cleanIdentifier.replace(/\D/g, '');

    const member = await prisma.member.findFirst({
      where: {
        gymId: gym.id,
        OR: [
          { memberCode: { equals: cleanIdentifier, mode: 'insensitive' } },
          ...(cleanPhoneDigits.length >= 10
            ? [{ phone: { contains: cleanPhoneDigits.slice(-10) } }]
            : []),
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
      if (sn) {
        return new NextResponse('OK: 0\nReturn=-1\nAccess=0\nReason=NOT_FOUND\n', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return NextResponse.json(
        { ok: false, status: 'DENIED', access: 0, relay: false, error: `Member "${cleanIdentifier}" not found in gym` },
        { status: 404 }
      );
    }

    const now = timestamp || new Date();
    const latest = member.memberships[0];

    // Check expiration - strictly deny biometric access and lock turnstiles if expired
    if (!latest || latest.expiresAt < now) {
      const daysOverdue = latest
        ? Math.max(1, Math.round((now.getTime() - latest.expiresAt.getTime()) / 86400000))
        : null;

      if (sn) {
        // Explicitly deny ZKTeco / eSSL ADMS hardware terminal
        // Returning OK: 0, Access=0, Return=-1 triggers terminal rejection beep and keeps relay locked
        return new NextResponse(`OK: 0\nReturn=-1\nAccess=0\nReason=EXPIRED\n`, {
          status: 403,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      return NextResponse.json(
        {
          ok: false,
          status: 'DENIED',
          access: 0,
          relay: false, // Turnstile relay stays locked
          rejectionReason: 'EXPIRED',
          error: `🚫 ACCESS DENIED: Membership for ${member.name} has EXPIRED${daysOverdue ? ` (${daysOverdue} days overdue)` : ''}. Biometric access is locked. Please renew membership at front desk.`,
          memberName: member.name,
          memberCode: member.memberCode,
          daysOverdue,
          isExpired: true,
        },
        { status: 403 }
      );
    }

    // Check if already checked in today
    const alreadyIn = await prisma.attendance.findFirst({
      where: {
        gymId: gym.id,
        memberId: member.id,
        checkedInAt: { gte: startOfDayIST(now) },
      },
    });

    if (alreadyIn) {
      if (sn) {
        return new NextResponse('OK: 1\n', { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }

      return NextResponse.json({
        ok: true,
        status: 'DUPLICATE',
        relay: true,
        message: 'Member already checked in today',
        memberName: member.name,
        memberCode: member.memberCode,
        checkIn: toCheckInRecord(alreadyIn),
      });
    }

    // Record check-in
    const row = await prisma.attendance.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        checkedInAt: now,
      },
    });

    const daysLeft = Math.round((latest.expiresAt.getTime() - now.getTime()) / 86400000);

    if (sn) {
      return new NextResponse('OK: 1\n', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    return NextResponse.json({
      ok: true,
      status: 'GRANTED',
      relay: true, // Turnstile relay unlock pulse
      message: 'Access granted. Welcome to the gym!',
      memberName: member.name,
      memberCode: member.memberCode,
      planName: latest.plan.name,
      daysLeft,
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
