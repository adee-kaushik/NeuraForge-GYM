import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { startOfDayIST } from '@/lib/format';

// Everything that turns "a machine said member 42 punched at 06:31" into an attendance row lives here,
// so the cloud-push route, the REST API, the LAN bridge and the portal's Test Punch all behave the same.

const MS_DAY = 86400000;
const IST_OFFSET_MS = 330 * 60000;

/** A punch more than this far in the future means the machine's clock is wrong. */
const MAX_FUTURE_MS = 10 * 60000;
/** Punches older than this are stored but never turned into attendance. */
const MAX_AGE_MS = 31 * MS_DAY;
export const MAX_BATCH = 500;

export type PunchSource = 'ADMS' | 'API' | 'TEST' | 'MANUAL';

export type PunchStatus =
  | 'GRANTED' // attendance recorded
  | 'ALREADY_IN' // valid member, already has attendance for that day
  | 'EXPIRED' // membership over, no attendance recorded
  | 'UNKNOWN_ID' // no member with that machine ID in this gym
  | 'BAD_TIME' // timestamp missing, invalid or in the future (machine clock wrong)
  | 'STALE' // older than 31 days
  | 'REPLAY'; // exact same punch was already received (machine re-sent it)

export type PunchInput = {
  /** The ID exactly as the machine sent it (digits), or a member code / phone for REST and manual use */
  pin: string;
  /** null = the machine sent something unparseable */
  punchedAt: Date | null;
  verifyCode?: number | null;
};

export type PunchOutcome = {
  pin: string;
  status: PunchStatus;
  punchedAt: string | null;
  memberId?: string;
  memberName?: string;
  memberCode?: string;
  biometricId?: number | null;
  phone?: string;
  planName?: string;
  daysLeft?: number;
  daysOverdue?: number;
  checkInId?: string;
  checkedInAt?: string;
};

// ── Time ─────────────────────────────────────────────────────

/**
 * Machines send local wall-clock time with no timezone ("2026-10-17 06:31:07").
 * Gyms are in India, so that means IST. Strings that already carry Z or an offset are taken as written.
 */
export function parseDeviceTime(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000);
  if (/^\d{13}$/.test(s)) return new Date(Number(s));

  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s);
  if (hasZone) {
    const d = new Date(s.replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se ?? 0)) - IST_OFFSET_MS;
  const out = new Date(utc);
  return isNaN(out.getTime()) ? null : out;
}

/** A membership is valid through the whole last day (IST), matching "0 days left" in the UI. */
export function membershipActiveAt(expiresAt: Date, at: Date): boolean {
  return expiresAt.getTime() >= startOfDayIST(at).getTime();
}

const daysBetweenIST = (later: Date, earlier: Date): number =>
  Math.round((startOfDayIST(later).getTime() - startOfDayIST(earlier).getTime()) / MS_DAY);

// ── Machine protocol bits ────────────────────────────────────

/** ZKTeco / eSSL verify codes. Exact numbers vary slightly by firmware; unknown ones come through as OTHER. */
export function verifyLabel(code: number | null | undefined): string | null {
  if (code === null || code === undefined) return null;
  switch (code) {
    case 0:
    case 3:
      return 'PASSWORD';
    case 1:
      return 'FINGERPRINT';
    case 2:
    case 4:
      return 'CARD';
    case 15:
      return 'FACE';
    case 25:
      return 'PALM';
    default:
      return 'OTHER';
  }
}

/**
 * Parse the body of a cloud-push upload (table=ATTLOG). One punch per line, tab separated:
 *   PIN <tab> 2026-10-17 06:31:07 <tab> status <tab> verify <tab> workcode ...
 * Returns every line, including unparseable ones, so the machine can be told exactly how many it sent us.
 */
export function parseAttLog(body: string): PunchInput[] {
  const out: PunchInput[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split(/\t|,|\s{2,}/).map((p) => p.trim());
    const pin = parts[0] ?? '';
    if (!pin) continue;
    const verifyRaw = parts[3];
    const verifyCode = verifyRaw !== undefined && /^\d{1,3}$/.test(verifyRaw) ? Number(verifyRaw) : null;
    out.push({ pin, punchedAt: parseDeviceTime(parts[1]), verifyCode });
  }
  return out;
}

// ── Member IDs on the machine ────────────────────────────────

const MAX_BIOMETRIC_ID = 99999999;

export type BiometricIdParse = { ok: true; value: number | null } | { ok: false; error: string };

/** Empty input = "assign automatically". Machines only accept digits. */
export function parseBiometricIdInput(raw: string | number | null | undefined): BiometricIdParse {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const s = String(raw).trim();
  if (!s) return { ok: true, value: null };
  if (!/^\d{1,8}$/.test(s)) return { ok: false, error: 'Biometric ID must be a number (digits only, no letters).' };
  const n = Number(s);
  if (n < 1 || n > MAX_BIOMETRIC_ID) return { ok: false, error: 'Biometric ID must be between 1 and 99999999.' };
  return { ok: true, value: n };
}

type Db = Prisma.TransactionClient | typeof prisma;

/** Next free machine ID in a gym (highest + 1). The unique index catches the rare race; callers retry on P2002. */
export async function nextBiometricId(db: Db, gymId: string): Promise<number> {
  const agg = await db.member.aggregate({ where: { gymId }, _max: { biometricId: true } });
  return (agg._max.biometricId ?? 0) + 1;
}

// ── Gym API key (LAN bridge / REST) ──────────────────────────

export function generateBiometricKey(): string {
  return `nfk_${randomBytes(24).toString('base64url')}`;
}

export const hashBiometricKey = (key: string): string => createHash('sha256').update(key).digest('hex');

export function keyMatches(provided: string, storedHash: string | null | undefined): boolean {
  if (!provided || !storedHash) return false;
  const a = Buffer.from(hashBiometricKey(provided), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function extractApiKey(req: Request): string {
  const auth = req.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const header = (req.headers.get('x-api-key') || '').trim();
  if (header) return header;
  // Last resort for tiny devices that can only set a URL. Headers are safer: URLs end up in logs.
  return (new URL(req.url).searchParams.get('apiKey') || '').trim();
}

// ── Devices and logs ─────────────────────────────────────────

export const normalizeSerial = (sn: string | null | undefined): string => String(sn ?? '').trim().toUpperCase();

export const isValidSerial = (sn: string): boolean => /^[A-Z0-9][A-Z0-9_-]{3,39}$/.test(sn);

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim() || null;
  return req.headers.get('x-real-ip');
}

/**
 * The registered machine for a serial number, or null. Updates "last seen" at most once a minute,
 * because machines poll every few seconds and we do not want a database write per poll.
 */
export async function findRegisteredDevice(sn: string, ip: string | null) {
  const serial = normalizeSerial(sn);
  if (!serial) return null;
  const device = await prisma.device.findUnique({ where: { serialNumber: serial }, include: { gym: { select: { id: true, slug: true } } } });
  if (!device || !device.isActive) return null;

  const stale = !device.lastSeenAt || Date.now() - device.lastSeenAt.getTime() > 60000;
  if (stale || (ip && device.lastIp !== ip)) {
    await prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date(), lastIp: ip } }).catch(() => {});
  }
  return device;
}

export async function logBiometric(entry: {
  gymId?: string | null;
  deviceSerial?: string | null;
  kind: 'HANDSHAKE' | 'ATTLOG' | 'OPERLOG' | 'UNREGISTERED' | 'API' | 'ERROR';
  summary: string;
  rawPreview?: string | null;
}): Promise<void> {
  try {
    await prisma.biometricLog.create({
      data: {
        gymId: entry.gymId ?? null,
        deviceSerial: entry.deviceSerial ?? null,
        kind: entry.kind,
        summary: entry.summary.slice(0, 300),
        rawPreview: entry.rawPreview ? entry.rawPreview.slice(0, 600) : null,
      },
    });
    // Keep the table small: roughly one insert in twenty clears entries older than two weeks.
    if (Math.random() < 0.05) {
      await prisma.biometricLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 14 * MS_DAY) } } });
    }
  } catch {
    // Logging must never break a punch.
  }
}

/** Unknown machines retry every minute or so; log them at most once every 10 minutes per serial. */
export async function logUnregisteredOnce(sn: string, ip: string | null, rawPreview?: string): Promise<void> {
  const serial = normalizeSerial(sn);
  if (!serial) return;
  const recent = await prisma.biometricLog.findFirst({
    where: { deviceSerial: serial, kind: 'UNREGISTERED', createdAt: { gt: new Date(Date.now() - 10 * 60000) } },
    select: { id: true },
  });
  if (recent) return;
  await logBiometric({
    kind: 'UNREGISTERED',
    deviceSerial: serial,
    summary: `Unregistered machine ${serial} tried to connect${ip ? ` from ${ip}` : ''}. Register this serial number in the gym's Biometrics Hub.`,
    rawPreview,
  });
}

// ── The punch pipeline ───────────────────────────────────────

const isDigits = (s: string) => /^\d{1,9}$/.test(s);

/**
 * Turn punches into attendance. Handles whole batches in a fixed number of queries,
 * because a machine that was offline for a day uploads hundreds of punches at once.
 *
 * Rules:
 *  - a re-sent punch (same machine, ID and second) is a REPLAY and changes nothing
 *  - the machine's ID is matched to Member.biometricId; REST and manual input may also use member code or phone
 *  - one attendance row per member per IST day, however many times they punch
 *  - an expired member's punch is stored for the owner to see, but never becomes attendance
 */
export async function processPunches(opts: {
  gymId: string;
  punches: PunchInput[];
  source: PunchSource;
  deviceSerial?: string;
  now?: Date;
}): Promise<PunchOutcome[]> {
  const { gymId, source } = opts;
  const now = opts.now ?? new Date();
  const deviceSerial = opts.deviceSerial ?? '';
  const punches = opts.punches.slice(0, MAX_BATCH).map((p) => ({ ...p, pin: String(p.pin ?? '').trim() }));
  const persist = source !== 'MANUAL';

  const outcomes: PunchOutcome[] = punches.map((p) => ({
    pin: p.pin,
    status: 'UNKNOWN_ID' as PunchStatus,
    punchedAt: p.punchedAt ? p.punchedAt.toISOString() : null,
  }));

  // 1. Time checks
  const live: number[] = []; // indexes still being processed
  punches.forEach((p, i) => {
    if (!p.pin) {
      outcomes[i].status = 'UNKNOWN_ID';
      return;
    }
    if (!p.punchedAt) {
      outcomes[i].status = 'BAD_TIME';
      return;
    }
    if (p.punchedAt.getTime() > now.getTime() + MAX_FUTURE_MS) {
      outcomes[i].status = 'BAD_TIME';
    } else if (now.getTime() - p.punchedAt.getTime() > MAX_AGE_MS) {
      outcomes[i].status = 'STALE';
    } else {
      live.push(i);
      return;
    }
    // BAD_TIME / STALE with a real date are still stored for the record
  });

  // 2. Resolve members: machine ID first, then (REST / manual only) member code and phone
  const memberInclude = {
    memberships: { orderBy: { expiresAt: 'desc' as const }, take: 1, include: { plan: true } },
  };
  type ResolvedMember = Prisma.MemberGetPayload<{ include: typeof memberInclude }>;

  const byPin = new Map<string, ResolvedMember>();
  const candidatePins = [...new Set(punches.map((p) => p.pin).filter(Boolean))];

  const ints = candidatePins.filter(isDigits).map(Number);
  if (ints.length) {
    const rows = await prisma.member.findMany({ where: { gymId, biometricId: { in: ints } }, include: memberInclude });
    for (const m of rows) if (m.biometricId !== null) byPin.set(String(m.biometricId), m);
  }

  // Legacy gyms enrolled people under their member code before biometric IDs existed
  const unresolved = candidatePins.filter((p) => !byPin.has(String(isDigits(p) ? Number(p) : p)) && !byPin.has(p));
  if (unresolved.length && unresolved.length <= 50) {
    const rows = await prisma.member.findMany({
      where: { gymId, OR: unresolved.map((c) => ({ memberCode: { equals: c, mode: 'insensitive' as const } })) },
      include: memberInclude,
    });
    for (const m of rows) {
      for (const c of unresolved) if (m.memberCode.toLowerCase() === c.toLowerCase() && !byPin.has(c)) byPin.set(c, m);
    }
  }

  if (source !== 'ADMS') {
    const phonePins = candidatePins.filter((p) => !byPin.has(p) && p.replace(/\D/g, '').length >= 10).slice(0, 20);
    for (const p of phonePins) {
      const m = await prisma.member.findFirst({
        where: { gymId, phone: { contains: p.replace(/\D/g, '').slice(-10) } },
        include: memberInclude,
      });
      if (m) byPin.set(p, m);
    }
  }

  const memberFor = (pin: string): ResolvedMember | undefined => byPin.get(isDigits(pin) ? String(Number(pin)) : pin) ?? byPin.get(pin);

  // 3. Replays: punches this machine already sent us
  const replayKeys = new Set<string>();
  if (persist && live.length) {
    const times = live.map((i) => punches[i].punchedAt!.getTime());
    const known = await prisma.biometricPunch.findMany({
      where: {
        gymId,
        deviceSerial,
        pin: { in: [...new Set(live.map((i) => punches[i].pin))] },
        punchedAt: { gte: new Date(Math.min(...times)), lte: new Date(Math.max(...times)) },
      },
      select: { pin: true, punchedAt: true },
    });
    for (const k of known) replayKeys.add(`${k.pin}|${k.punchedAt.getTime()}`);
  }

  // 4. Existing attendance for the days involved
  const attendanceDays = new Set<string>();
  const memberIds = [...new Set(live.map((i) => memberFor(punches[i].pin)?.id).filter((x): x is string => !!x))];
  if (memberIds.length && live.length) {
    const times = live.map((i) => punches[i].punchedAt!.getTime());
    const from = startOfDayIST(new Date(Math.min(...times)));
    const to = new Date(startOfDayIST(new Date(Math.max(...times))).getTime() + MS_DAY);
    const rows = await prisma.attendance.findMany({
      where: { gymId, memberId: { in: memberIds }, checkedInAt: { gte: from, lt: to } },
      select: { memberId: true, checkedInAt: true },
    });
    for (const r of rows) attendanceDays.add(`${r.memberId}|${startOfDayIST(r.checkedInAt).getTime()}`);
  }

  // 5. Decide, oldest punch first so the earliest punch of a day is the one that counts
  const order = [...live].sort((a, b) => punches[a].punchedAt!.getTime() - punches[b].punchedAt!.getTime());
  const seenInBatch = new Set<string>();
  const attendanceRows: Prisma.AttendanceCreateManyInput[] = [];

  for (const i of order) {
    const p = punches[i];
    const at = p.punchedAt!;
    const key = `${p.pin}|${at.getTime()}`;

    if (replayKeys.has(key) || seenInBatch.has(key)) {
      outcomes[i].status = 'REPLAY';
      const m = memberFor(p.pin);
      if (m) Object.assign(outcomes[i], { memberId: m.id, memberName: m.name, memberCode: m.memberCode, biometricId: m.biometricId });
      continue;
    }
    seenInBatch.add(key);

    const m = memberFor(p.pin);
    if (!m) {
      outcomes[i].status = 'UNKNOWN_ID';
      continue;
    }

    const latest = m.memberships[0];
    Object.assign(outcomes[i], {
      memberId: m.id,
      memberName: m.name,
      memberCode: m.memberCode,
      biometricId: m.biometricId,
      phone: m.phone,
      planName: latest?.plan.name,
    });

    if (!latest || !membershipActiveAt(latest.expiresAt, at)) {
      outcomes[i].status = 'EXPIRED';
      outcomes[i].daysOverdue = latest ? Math.max(1, daysBetweenIST(at, latest.expiresAt)) : undefined;
      continue;
    }

    outcomes[i].daysLeft = daysBetweenIST(latest.expiresAt, at);

    const dayKey = `${m.id}|${startOfDayIST(at).getTime()}`;
    if (attendanceDays.has(dayKey)) {
      outcomes[i].status = 'ALREADY_IN';
      continue;
    }
    attendanceDays.add(dayKey);

    const id = randomUUID();
    attendanceRows.push({ id, gymId, memberId: m.id, checkedInAt: at });
    outcomes[i].status = 'GRANTED';
    outcomes[i].checkInId = id;
    outcomes[i].checkedInAt = at.toISOString();
  }

  // 6. Save: attendance first, then the raw punches (skipDuplicates covers two uploads racing each other)
  if (attendanceRows.length) await prisma.attendance.createMany({ data: attendanceRows });

  if (persist) {
    const punchRows: Prisma.BiometricPunchCreateManyInput[] = [];
    const stored = new Set<string>();
    punches.forEach((p, i) => {
      if (!p.punchedAt || outcomes[i].status === 'REPLAY') return;
      const key = `${p.pin}|${p.punchedAt.getTime()}`;
      if (stored.has(key)) return;
      stored.add(key);
      punchRows.push({
        gymId,
        deviceSerial,
        pin: p.pin.slice(0, 40),
        memberId: outcomes[i].memberId ?? null,
        punchedAt: p.punchedAt,
        verifyType: verifyLabel(p.verifyCode ?? null),
        verifyCode: p.verifyCode ?? null,
        source,
        result: outcomes[i].status,
      });
    });
    if (punchRows.length) await prisma.biometricPunch.createMany({ data: punchRows, skipDuplicates: true });
  }

  return outcomes;
}

export function summarizeOutcomes(outcomes: PunchOutcome[]): string {
  const counts: Record<string, number> = {};
  for (const o of outcomes) counts[o.status] = (counts[o.status] ?? 0) + 1;
  const parts = Object.entries(counts).map(([k, v]) => `${v} ${k.toLowerCase().replace('_', ' ')}`);
  return `${outcomes.length} punch${outcomes.length === 1 ? '' : 'es'}: ${parts.join(', ') || 'none'}`;
}
