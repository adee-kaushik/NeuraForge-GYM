import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  extractApiKey,
  keyMatches,
  logBiometric,
  MAX_BATCH,
  parseDeviceTime,
  processPunches,
  summarizeOutcomes,
  type PunchInput,
  type PunchOutcome,
} from '@/lib/biometric';

/**
 * REST attendance endpoint, for everything that is not a cloud-push machine:
 * the LAN bridge script, Mantra / other machines with an HTTP option, or your own integration.
 * (ZKTeco / eSSL machines that push by themselves use /iclock/cdata instead.)
 *
 * POST /api/attendance/biometric
 *   Header:  x-api-key: <the gym's key>        (or  Authorization: Bearer <key>)
 *   One punch:  { "gymSlug": "rfz", "identifier": "42", "timestamp": "2026-10-17T05:00:39Z" }
 *   A batch:    { "gymSlug": "rfz", "punches": [ { "identifier": "42", "timestamp": "..." }, ... ] }   (max 500)
 *
 * "identifier" is the number the member is enrolled under on the machine (their Biometric ID).
 * A timestamp without a timezone ("2026-10-17 06:31:07") is read as IST. Leave it out to mean "now".
 * Each gym has its own key, generated in Members -> Biometrics Hub. Without a key the gym cannot use this endpoint.
 */

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'NeuraFitness Biometric Attendance API',
    status: 'ONLINE',
    usage: 'POST JSON with an x-api-key header. See Members > Biometrics Hub.',
  });
}

const deny = (status: number, error: string) =>
  NextResponse.json({ ok: false, status: 'DENIED', access: 0, relay: false, error }, { status });

type RawPunch = { identifier?: unknown; pin?: unknown; timestamp?: unknown; verifyType?: unknown };

function toPunch(raw: RawPunch, now: Date): PunchInput {
  const pin = String(raw.identifier ?? raw.pin ?? '').trim();
  const verifyCode = typeof raw.verifyType === 'number' ? raw.verifyType : null;
  if (raw.timestamp === undefined || raw.timestamp === null || raw.timestamp === '') {
    return { pin, punchedAt: now, verifyCode };
  }
  return { pin, punchedAt: parseDeviceTime(String(raw.timestamp)), verifyCode };
}

const slim = (o: PunchOutcome) => ({
  identifier: o.pin,
  status: o.status,
  memberName: o.memberName,
  memberCode: o.memberCode,
  biometricId: o.biometricId,
  punchedAt: o.punchedAt,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return deny(400, 'Send a JSON body.');

    const gymSlug = String(body.gymSlug ?? req.nextUrl.searchParams.get('gymSlug') ?? '').trim().toLowerCase();
    if (!gymSlug) return deny(400, 'gymSlug is required.');

    const providedKey = extractApiKey(req);
    if (!providedKey) return deny(401, 'Missing API key. Send it in the x-api-key header.');

    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug },
      select: { id: true, slug: true, biometricKeyHash: true },
    });
    // Same answer for "no such gym", "no key set" and "wrong key": do not reveal which gym codes exist.
    if (!gym || !gym.biometricKeyHash || !keyMatches(providedKey, gym.biometricKeyHash)) {
      return deny(401, 'Invalid gym code or API key. Generate a key in Members > Biometrics Hub.');
    }

    const now = new Date();
    const isBatch = Array.isArray(body.punches);
    const rawPunches: RawPunch[] = isBatch ? body.punches : [body];
    if (rawPunches.length === 0) return deny(400, 'No punches in the request.');
    if (rawPunches.length > MAX_BATCH) return deny(400, `Send at most ${MAX_BATCH} punches per request.`);

    const punches = rawPunches.map((r) => toPunch(r ?? {}, now));
    if (!isBatch && !punches[0].pin) return deny(400, "identifier (the member's biometric ID) is required.");

    const outcomes = await processPunches({ gymId: gym.id, punches, source: 'API', now });

    await logBiometric({
      gymId: gym.id,
      kind: 'API',
      summary: summarizeOutcomes(outcomes),
      rawPreview: JSON.stringify(rawPunches.slice(0, 3)),
    });

    if (isBatch) {
      const counts: Record<string, number> = {};
      for (const o of outcomes) counts[o.status] = (counts[o.status] ?? 0) + 1;
      return NextResponse.json({ ok: true, received: outcomes.length, counts, results: outcomes.map(slim) });
    }

    // Single punch: keep the simple answer the bridge script and older integrations expect.
    const o = outcomes[0];
    const base = { memberName: o.memberName, memberCode: o.memberCode, biometricId: o.biometricId };

    switch (o.status) {
      case 'GRANTED':
        return NextResponse.json({
          ok: true,
          status: 'GRANTED',
          relay: true,
          message: 'Access granted. Welcome to the gym!',
          ...base,
          planName: o.planName,
          daysLeft: o.daysLeft,
          checkIn: { id: o.checkInId, memberId: o.memberId, checkedInAt: o.checkedInAt },
        });
      case 'ALREADY_IN':
      case 'REPLAY':
        return NextResponse.json({ ok: true, status: 'DUPLICATE', relay: true, message: 'Already checked in today.', ...base });
      case 'STALE':
        return NextResponse.json({ ok: true, status: 'STALE', relay: false, message: 'Punch is older than 31 days; stored but not counted.', ...base });
      case 'EXPIRED':
        return NextResponse.json(
          {
            ok: false,
            status: 'DENIED',
            access: 0,
            relay: false,
            rejectionReason: 'EXPIRED',
            error: `Membership for ${o.memberName} has expired${o.daysOverdue ? ` (${o.daysOverdue} days overdue)` : ''}. Please renew at the front desk.`,
            daysOverdue: o.daysOverdue,
            isExpired: true,
            ...base,
          },
          { status: 403 }
        );
      case 'BAD_TIME':
        return deny(400, "Timestamp is missing, invalid, or in the future. Check the machine's clock.");
      default:
        return deny(404, `No member with biometric ID "${o.pin}" in this gym.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    await logBiometric({ kind: 'ERROR', summary: `API error: ${message}` });
    return NextResponse.json({ ok: false, status: 'ERROR', error: message }, { status: 500 });
  }
}
