// Universal Gym Data Importer & Migration Engine
// Pure functions (no database, no React) used by both the browser preview/mapper and the server action.

export interface RawImportRow {
  name: string;
  phone: string;
  email: string;
  plan: string;
  expiry: string;
  memberCode?: string; // Existing Member ID or Biometric Machine ID
}

export type ValidatedRow =
  | {
      ok: true;
      line: number;
      name: string;
      phone: string;
      email: string;
      planId: string;
      expiresAt: string;
      memberCode?: string;
    }
  | { ok: false; line: number; error: string };

export const MAX_IMPORT_ROWS = 2000;

// ── CSV parsing ──────────────────────────────────────────────

export const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = [',', ';', '\t'].reduce(
    (best, c) => (firstLine.split(c).length > firstLine.split(best).length ? c : best),
    ','
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop completely empty lines
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
};

export const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

export const HEADER_ALIASES: Record<keyof RawImportRow, string[]> = {
  name: [
    'name',
    'membername',
    'fullname',
    'clientname',
    'customername',
    'member',
    'user',
    'studentname',
    'firstandlastname',
  ],
  phone: [
    'phone',
    'phonenumber',
    'mobile',
    'mobilenumber',
    'contact',
    'contactnumber',
    'whatsapp',
    'mobileno',
    'cell',
    'cellphone',
    'telephone',
  ],
  email: ['email', 'emailid', 'mail', 'emailaddress'],
  plan: [
    'plan',
    'planname',
    'membership',
    'plantype',
    'package',
    'membershiptype',
    'subscription',
    'scheme',
    'packagename',
  ],
  expiry: [
    'expiry',
    'expirydate',
    'expires',
    'enddate',
    'validtill',
    'validuntil',
    'validupto',
    'duedate',
    'renewdate',
    'membershipexpiry',
    'expiration',
  ],
  memberCode: [
    'memberid',
    'membercode',
    'cardno',
    'badgeid',
    'biometricid',
    'punchid',
    'regno',
    'enrollno',
    'id',
    'gymid',
    'code',
  ],
};

export interface ColumnDetection {
  mapping: Record<keyof RawImportRow, number>;
  headers: string[];
  missingRequired: (keyof RawImportRow)[];
}

export const detectColumnMapping = (headerRow: string[]): ColumnDetection => {
  const normalized = headerRow.map(normalizeHeader);
  const mapping: Record<keyof RawImportRow, number> = {
    name: -1,
    phone: -1,
    email: -1,
    plan: -1,
    expiry: -1,
    memberCode: -1,
  };

  (Object.keys(HEADER_ALIASES) as (keyof RawImportRow)[]).forEach((key) => {
    const aliases = HEADER_ALIASES[key];
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx !== -1) {
      mapping[key] = idx;
    }
  });

  const missingRequired: (keyof RawImportRow)[] = [];
  if (mapping.name === -1) missingRequired.push('name');
  if (mapping.phone === -1) missingRequired.push('phone');
  if (mapping.plan === -1) missingRequired.push('plan');
  if (mapping.expiry === -1) missingRequired.push('expiry');

  return { mapping, headers: headerRow, missingRequired };
};

// Turns the parsed table into raw rows using a specific column index mapping
export const tableToRowsWithMapping = (
  table: string[][],
  mapping: Record<keyof RawImportRow, number>
): { rows: RawImportRow[]; error?: string } => {
  if (table.length < 2) return { rows: [], error: 'The file contains no member rows.' };

  const cell = (r: string[], i: number) => (i >= 0 && i < r.length ? (r[i] ?? '').trim() : '');

  const rows = table.slice(1).map((r) => ({
    name: cell(r, mapping.name),
    phone: cell(r, mapping.phone),
    email: cell(r, mapping.email),
    plan: cell(r, mapping.plan),
    expiry: cell(r, mapping.expiry),
    memberCode: mapping.memberCode >= 0 ? cell(r, mapping.memberCode) : undefined,
  }));

  return { rows };
};

// Legacy fallback
export const tableToRows = (table: string[][]): { rows: RawImportRow[]; error?: string } => {
  if (table.length < 2) return { rows: [], error: 'The file has no member rows.' };
  const detection = detectColumnMapping(table[0]);
  if (detection.missingRequired.length > 0) {
    return {
      rows: [],
      error: `Missing column(s): ${detection.missingRequired.join(', ')}. Use the mapping step to match columns.`,
    };
  }
  return tableToRowsWithMapping(table, detection.mapping);
};

// ── Field checks ─────────────────────────────────────────────

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Flexible date parser: handles Excel serial numbers, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-Mon-YYYY
export const parseExpiry = (raw: string): string | null => {
  const s = raw.trim();
  if (!s) return null;

  // Handle Excel numeric serial dates (e.g. 45200)
  if (/^\d{5}$/.test(s)) {
    const serial = Number(s);
    if (serial > 30000 && serial < 60000) {
      // Excel epoch: 1899-12-30
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 18, 29, 59)).toISOString();
      }
    }
  }

  let y: number, m: number, d: number;

  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) {
    // Default Indian/UK day first: DD/MM/YYYY. If month > 12, swap.
    let first = Number(match[1]);
    let second = Number(match[2]);
    y = Number(match[3]);

    if (first > 12) {
      d = first;
      m = second;
    } else if (second > 12) {
      m = first;
      d = second;
    } else {
      d = first;
      m = second;
    }
  } else if ((match = s.match(/^(\d{1,2})[ /-]([A-Za-z]{3})[A-Za-z]*[ ,/-]*(\d{2,4})$/))) {
    d = Number(match[1]);
    m = MONTHS.indexOf(match[2].toLowerCase()) + 1;
    let yearNum = Number(match[3]);
    if (yearNum < 100) yearNum += 2000;
    y = yearNum;
    if (m === 0) return null;
  } else {
    // Fallback Date.parse
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) {
      const dt = new Date(parsed);
      y = dt.getFullYear();
      m = dt.getMonth() + 1;
      d = dt.getDate();
    } else {
      return null;
    }
  }

  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;

  // 23:59:59 IST = 18:29:59 UTC of the same day
  return new Date(Date.UTC(y, m - 1, d, 18, 29, 59)).toISOString();
};

export const phoneKey = (phone: string): string => phone.replace(/\D/g, '').slice(-10);

export const normalizePhone = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Row validation with Plan Mapping ─────────────────────────

export interface ValidationSummary {
  checked: ValidatedRow[];
  unmatchedPlans: string[];
}

export const validateRows = (
  rows: RawImportRow[],
  plans: { id: string; name: string }[],
  existingPhoneKeys: Set<string>,
  planOverrides: Record<string, string> = {} // maps raw plan text -> planId
): ValidatedRow[] => {
  const seen = new Set(existingPhoneKeys);

  return rows.map((r, i) => {
    const line = i + 2; // line 1 is heading
    const fail = (error: string): ValidatedRow => ({ ok: false, line, error });

    const name = r.name.trim();
    if (!name) return fail('Name is missing');
    if (name.length > 80) return fail('Name is too long');

    const phone = normalizePhone(r.phone);
    if (!phone) return fail(`Phone number "${r.phone}" is not valid`);

    const email = r.email.trim();
    if (email && (email.length > 120 || !EMAIL_RE.test(email))) return fail('Email is not valid');

    const rawPlan = r.plan.trim();
    const mappedPlanId = planOverrides[rawPlan.toLowerCase()] ||
      plans.find((p) => p.name.trim().toLowerCase() === rawPlan.toLowerCase())?.id;

    if (!mappedPlanId) {
      return fail(`Plan "${rawPlan || 'Empty'}" does not match any gym plan`);
    }

    const expiresAt = parseExpiry(r.expiry);
    if (!expiresAt) return fail(`Expiry date "${r.expiry}" is not recognized`);

    const key = phoneKey(phone);
    if (seen.has(key)) return fail(`Phone number ${phone} is already registered`);
    seen.add(key);

    const memberCode = r.memberCode?.trim() || undefined;

    return {
      ok: true,
      line,
      name,
      phone,
      email,
      planId: mappedPlanId,
      expiresAt,
      memberCode,
    };
  });
};

// Extracts unique plan names from rows that do not match existing gym plans
export const findUnmatchedPlans = (
  rows: RawImportRow[],
  plans: { id: string; name: string }[]
): string[] => {
  const known = new Set(plans.map((p) => p.name.trim().toLowerCase()));
  const unmatched = new Set<string>();

  rows.forEach((r) => {
    const p = r.plan.trim();
    if (p && !known.has(p.toLowerCase())) {
      unmatched.add(p);
    }
  });

  return Array.from(unmatched);
};

export const TEMPLATE_CSV =
  'name,phone,email,plan,expiry date,member id\n' +
  'Rahul Sharma,9876543210,rahul@example.com,Monthly,25/11/2026,MEM-001\n' +
  'Priya Singh,9123456780,,Yearly,14/03/2027,MEM-002\n' +
  'Amit Patel,9988776655,amit@fit.in,Quarterly,10/06/2027,105\n';
