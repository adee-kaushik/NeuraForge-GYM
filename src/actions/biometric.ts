'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import {
  generateBiometricKey,
  hashBiometricKey,
  isValidSerial,
  normalizeSerial,
} from '@/lib/biometric';

// Owner-side controls for biometric machines. The gym always comes from the logged-in session, never from input.

const NOT_OWNER = 'Only the gym owner can change biometric settings.';

export type DeviceRecord = {
  id: string;
  name: string;
  serialNumber: string;
  protocol: string;
  lastSeenAt: string | null;
  lastIp: string | null;
};

export type BiometricActivity = {
  id: string;
  at: string;
  kind: string;
  deviceSerial: string | null;
  summary: string;
};

export type RecentPunch = {
  id: string;
  at: string;
  pin: string;
  memberName: string | null;
  result: string;
  verifyType: string | null;
  source: string;
};

export type BiometricOverview =
  | {
      ok: true;
      attendanceMode: 'QR' | 'BIOMETRIC';
      hasKey: boolean;
      isOwner: boolean;
      devices: DeviceRecord[];
      activity: BiometricActivity[];
      punches: RecentPunch[];
      serverTime: string;
    }
  | { ok: false; error: string };

export async function getBiometricOverview(): Promise<BiometricOverview> {
  const staff = await requireStaff();
  const gymId = staff.gymId;

  const [gym, devices, activity, punches] = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId }, select: { attendanceMode: true, biometricKeyHash: true } }),
    prisma.device.findMany({ where: { gymId }, orderBy: { createdAt: 'asc' } }),
    prisma.biometricLog.findMany({ where: { gymId }, orderBy: { createdAt: 'desc' }, take: 15 }),
    prisma.biometricPunch.findMany({ where: { gymId }, orderBy: { punchedAt: 'desc' }, take: 10 }),
  ]);
  if (!gym) return { ok: false, error: 'Gym not found.' };

  const ids = [...new Set(punches.map((p) => p.memberId).filter((x): x is string => !!x))];
  const members = ids.length
    ? await prisma.member.findMany({ where: { gymId, id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const nameOf = new Map(members.map((m) => [m.id, m.name]));

  return {
    ok: true,
    attendanceMode: gym.attendanceMode,
    hasKey: !!gym.biometricKeyHash,
    isOwner: staff.role === 'OWNER',
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      protocol: d.protocol,
      lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
      lastIp: d.lastIp,
    })),
    activity: activity.map((a) => ({
      id: a.id,
      at: a.createdAt.toISOString(),
      kind: a.kind,
      deviceSerial: a.deviceSerial,
      summary: a.summary,
    })),
    punches: punches.map((p) => ({
      id: p.id,
      at: p.punchedAt.toISOString(),
      pin: p.pin,
      memberName: p.memberId ? nameOf.get(p.memberId) ?? null : null,
      result: p.result,
      verifyType: p.verifyType,
      source: p.source,
    })),
    serverTime: new Date().toISOString(),
  };
}

export type RegisterDeviceResult = { ok: true; device: DeviceRecord } | { ok: false; error: string };

export async function registerDevice(serialRaw: string, nameRaw: string): Promise<RegisterDeviceResult> {
  const staff = await requireStaff();
  if (staff.role !== 'OWNER') return { ok: false, error: NOT_OWNER };

  const serial = normalizeSerial(serialRaw);
  const name = nameRaw.trim().slice(0, 60) || 'Biometric machine';
  if (!isValidSerial(serial)) {
    return {
      ok: false,
      error: 'Enter the serial number exactly as shown on the machine (letters and digits, 4 to 40 characters). Find it under Menu → System Info → Device Info, or on the sticker at the back.',
    };
  }

  const existing = await prisma.device.findUnique({ where: { serialNumber: serial } });
  if (existing) {
    return {
      ok: false,
      error:
        existing.gymId === staff.gymId
          ? 'This machine is already registered in your gym.'
          : 'This serial number is already registered to another gym. If you bought the machine second-hand, ask the previous owner to remove it first.',
    };
  }

  let d;
  try {
    d = await prisma.device.create({ data: { gymId: staff.gymId, serialNumber: serial, name } });
  } catch (e) {
    // Two registrations of the same serial at the same moment: the unique index lets only one through
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, error: 'This serial number is already registered.' };
    }
    return { ok: false, error: 'Could not register the machine. Please try again.' };
  }
  return {
    ok: true,
    device: {
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      protocol: d.protocol,
      lastSeenAt: null,
      lastIp: null,
    },
  };
}

export async function removeDevice(deviceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const staff = await requireStaff();
  if (staff.role !== 'OWNER') return { ok: false, error: NOT_OWNER };

  // Deleting frees the serial number, so a machine that changes hands can be registered by its new owner.
  const res = await prisma.device.deleteMany({ where: { id: deviceId, gymId: staff.gymId } });
  if (res.count !== 1) return { ok: false, error: 'Machine not found.' };
  return { ok: true };
}

export type RotateKeyResult = { ok: true; key: string } | { ok: false; error: string };

/** Creates a new key and invalidates the old one. The plain key is returned once and never stored. */
export async function rotateBiometricKey(): Promise<RotateKeyResult> {
  const staff = await requireStaff();
  if (staff.role !== 'OWNER') return { ok: false, error: NOT_OWNER };

  const key = generateBiometricKey();
  await prisma.gym.update({ where: { id: staff.gymId }, data: { biometricKeyHash: hashBiometricKey(key) } });
  return { ok: true, key };
}

export async function setAttendanceMode(
  mode: 'QR' | 'BIOMETRIC'
): Promise<{ ok: true; mode: 'QR' | 'BIOMETRIC' } | { ok: false; error: string }> {
  const staff = await requireStaff();
  if (staff.role !== 'OWNER') return { ok: false, error: NOT_OWNER };
  if (mode !== 'QR' && mode !== 'BIOMETRIC') return { ok: false, error: 'Invalid attendance mode.' };

  await prisma.gym.update({ where: { id: staff.gymId }, data: { attendanceMode: mode } });
  return { ok: true, mode };
}
