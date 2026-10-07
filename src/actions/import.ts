'use server';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { addMonths } from '@/lib/format';
import { nextId } from '@/lib/ids';
import { MAX_IMPORT_ROWS, phoneKey, validateRows, type RawImportRow } from '@/lib/import';
import type { MemberRecord } from '@/types';

export type ImportResult =
  | { ok: true; members: MemberRecord[]; skipped: { line: number; error: string }[] }
  | { ok: false; error: string };

// Adds many existing members at once. Everything is checked again here, on the server,
// whatever the browser's preview said.
export async function importMembers(rows: RawImportRow[]): Promise<ImportResult> {
  const staff = await requireStaff();
  if (staff.role !== 'OWNER') return { ok: false, error: 'Only the gym owner can import members.' };
  const gymId = staff.gymId;

  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: 'There are no rows to import.' };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `Import up to ${MAX_IMPORT_ROWS} members at a time.` };
  }

  // Only plain text fields are accepted
  const clean: RawImportRow[] = rows.map((r) => ({
    name: String(r?.name ?? ''),
    phone: String(r?.phone ?? ''),
    email: String(r?.email ?? ''),
    plan: String(r?.plan ?? ''),
    expiry: String(r?.expiry ?? ''),
  }));

  const [plans, existing] = await Promise.all([
    prisma.plan.findMany({ where: { gymId, isActive: true } }),
    prisma.member.findMany({ where: { gymId }, select: { phone: true, memberCode: true } }),
  ]);

  const checked = validateRows(clean, plans, new Set(existing.map((m) => phoneKey(m.phone))));
  const skipped = checked.flatMap((r) => ('error' in r ? [{ line: r.line, error: r.error }] : []));
  const valid = checked.flatMap((r) => ('error' in r ? [] : [r]));
  if (valid.length === 0) return { ok: false, error: 'No valid rows to import.' };

  const now = new Date();
  const codes = existing.map((m) => m.memberCode);
  const memberData: Prisma.MemberCreateManyInput[] = [];
  const membershipData: Prisma.MembershipCreateManyInput[] = [];
  const records: MemberRecord[] = [];

  for (const row of valid) {
    const plan = plans.find((p) => p.id === row.planId)!;
    const id = randomUUID();
    const memberCode = nextId(codes, 'MEM-', 1, 3);
    codes.push(memberCode);

    const expiresAt = new Date(row.expiresAt);
    // The plan started one plan-length before it expires (never in the future)
    let startsAt = addMonths(expiresAt, -plan.durationMonths);
    if (startsAt > now) startsAt = now;

    memberData.push({
      id,
      gymId,
      memberCode,
      name: row.name,
      phone: row.phone,
      email: row.email || null,
      joinedAt: startsAt,
    });
    membershipData.push({ gymId, memberId: id, planId: plan.id, startsAt, expiresAt });
    records.push({
      id,
      memberCode,
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
    // All or nothing: either every valid member is saved, or none
    await prisma.$transaction([
      prisma.member.createMany({ data: memberData }),
      prisma.membership.createMany({ data: membershipData }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, error: 'Someone added a member at the same time. Please try the import again.' };
    }
    return { ok: false, error: 'Could not import the members. Please try again.' };
  }

  return { ok: true, members: records, skipped };
}
