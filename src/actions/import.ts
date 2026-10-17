'use server';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { addMonths } from '@/lib/format';
import { nextId } from '@/lib/ids';
import { toMembershipPlan } from '@/lib/plans';
import {
  MAX_IMPORT_ROWS,
  phoneKey,
  validateRows,
  type RawImportRow,
} from '@/lib/import';
import type { MemberRecord, MembershipPlan } from '@/types';

export interface NewPlanToCreate {
  name: string;
  durationMonths: number;
  price: number;
}

export interface ImportOptions {
  planOverrides?: Record<string, string>; // rawPlanName.toLowerCase() -> planId
  createPlans?: NewPlanToCreate[];
}

export type ImportResult =
  | {
      ok: true;
      members: MemberRecord[];
      newPlans: MembershipPlan[];
      skipped: { line: number; error: string }[];
    }
  | { ok: false; error: string };

export async function importMembers(
  rows: RawImportRow[],
  options: ImportOptions = {}
): Promise<ImportResult> {
  const staff = await requireStaff();
  if (staff.role !== 'OWNER') return { ok: false, error: 'Only the gym owner can import members.' };
  const gymId = staff.gymId;

  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: 'There are no rows to import.' };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `Import up to ${MAX_IMPORT_ROWS} members at a time.` };
  }

  // Auto-create any requested new plans first
  const createdPlans: MembershipPlan[] = [];
  const planOverrides = { ...(options.planOverrides ?? {}) };

  if (Array.isArray(options.createPlans) && options.createPlans.length > 0) {
    for (const p of options.createPlans) {
      const cleanName = p.name.trim();
      if (!cleanName) continue;
      const duration = Number.isInteger(p.durationMonths) && p.durationMonths > 0 ? p.durationMonths : 1;
      const price = Number.isInteger(p.price) && p.price >= 0 ? p.price : 1000;

      const created = await prisma.plan.create({
        data: {
          gymId,
          name: cleanName,
          durationMonths: duration,
          price,
          features: ['Full Gym Access'],
          isActive: true,
        },
      });

      createdPlans.push(toMembershipPlan(created));

      planOverrides[cleanName.toLowerCase()] = created.id;
    }
  }

  const [allPlans, existing] = await Promise.all([
    prisma.plan.findMany({ where: { gymId, isActive: true } }),
    prisma.member.findMany({ where: { gymId }, select: { phone: true, memberCode: true, biometricId: true } }),
  ]);

  const clean: RawImportRow[] = rows.map((r) => ({
    name: String(r?.name ?? ''),
    phone: String(r?.phone ?? ''),
    email: String(r?.email ?? ''),
    plan: String(r?.plan ?? ''),
    expiry: String(r?.expiry ?? ''),
    memberCode: r?.memberCode ? String(r.memberCode).trim() : undefined,
  }));

  const checked = validateRows(
    clean,
    allPlans,
    new Set(existing.map((m) => phoneKey(m.phone))),
    planOverrides
  );

  const skipped = checked.flatMap((r) => ('error' in r ? [{ line: r.line, error: r.error }] : []));
  const valid = checked.flatMap((r) => ('error' in r ? [] : [r]));
  if (valid.length === 0) return { ok: false, error: 'No valid rows found to import.' };

  const now = new Date();
  const existingCodesSet = new Set(existing.map((m) => m.memberCode.toLowerCase()));
  const allCodes = existing.map((m) => m.memberCode);

  // Machine IDs: a numeric code in the sheet (307, MEM-307) is kept when free, so members already enrolled
  // on a machine keep working. Everyone else gets the next free number.
  const usedBiometricIds = new Set(existing.map((m) => m.biometricId).filter((n): n is number => n !== null));
  let maxBiometricId = existing.reduce((acc, m) => Math.max(acc, m.biometricId ?? 0), 0);
  const takeBiometricId = (code: string | undefined): number => {
    const m = code ? code.trim().match(/^(?:MEM-?)?(\d{1,8})$/i) : null;
    const wanted = m ? Number(m[1]) : 0;
    if (wanted > 0 && !usedBiometricIds.has(wanted)) {
      usedBiometricIds.add(wanted);
      maxBiometricId = Math.max(maxBiometricId, wanted);
      return wanted;
    }
    do {
      maxBiometricId += 1;
    } while (usedBiometricIds.has(maxBiometricId));
    usedBiometricIds.add(maxBiometricId);
    return maxBiometricId;
  };

  const memberData: Prisma.MemberCreateManyInput[] = [];
  const membershipData: Prisma.MembershipCreateManyInput[] = [];
  const records: MemberRecord[] = [];

  for (const row of valid) {
    const plan = allPlans.find((p) => p.id === row.planId)!;
    const id = randomUUID();

    // Preserve existing Member ID / Biometric Code if provided and unique
    let finalCode = row.memberCode;
    if (finalCode && !existingCodesSet.has(finalCode.toLowerCase())) {
      existingCodesSet.add(finalCode.toLowerCase());
      allCodes.push(finalCode);
    } else {
      finalCode = nextId(allCodes, 'MEM-', 1, 3);
      existingCodesSet.add(finalCode.toLowerCase());
      allCodes.push(finalCode);
    }

    const expiresAt = new Date(row.expiresAt);
    let startsAt = addMonths(expiresAt, -plan.durationMonths);
    if (startsAt > now) startsAt = now;

    const biometricId = takeBiometricId(row.memberCode);

    memberData.push({
      id,
      gymId,
      memberCode: finalCode,
      biometricId,
      name: row.name,
      phone: row.phone,
      email: row.email || null,
      joinedAt: startsAt,
    });

    membershipData.push({
      gymId,
      memberId: id,
      planId: plan.id,
      startsAt,
      expiresAt,
    });

    records.push({
      id,
      memberCode: finalCode,
      biometricId,
      name: row.name,
      phone: row.phone,
      email: row.email,
      planId: plan.id,
      joinedAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      hasLogin: false,
    });
  }

  try {
    await prisma.$transaction([
      prisma.member.createMany({ data: memberData }),
      prisma.membership.createMany({ data: membershipData }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, error: 'A member with this ID or phone was added concurrently. Please retry.' };
    }
    return { ok: false, error: 'Could not complete member import. Please check your data format.' };
  }

  return { ok: true, members: records, newPlans: createdPlans, skipped };
}
