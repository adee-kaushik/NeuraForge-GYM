// Importing existing members from a CSV file. Pure functions (no database, no React), so the same
// checks run in the browser for the preview and again on the server before anything is saved.

export interface RawImportRow {
  name: string;
  phone: string;
  email: string;
  plan: string;
  expiry: string;
}

export type ValidatedRow =
  | { ok: true; line: number; name: string; phone: string; email: string; planId: string; expiresAt: string }
  | { ok: false; line: number; error: string };

export const MAX_IMPORT_ROWS = 500;

// ── CSV parsing ──────────────────────────────────────────────

// Handles quoted fields, commas inside quotes, Windows line endings and the Excel BOM.
// Excel in some regions saves CSV with ; or tabs, so the separator is detected from the first line.
export const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = [',', ';', '\t'].reduce((best, c) => (firstLine.split(c).length > firstLine.split(best).length ? c : best), ',');

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

const HEADER_ALIASES: Record<keyof RawImportRow, string[]> = {
  name: ['name', 'membername', 'fullname'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contact', 'contactnumber', 'whatsapp'],
  email: ['email', 'emailid', 'mail'],
  plan: ['plan', 'planname', 'membership', 'plantype'],
  expiry: ['expiry', 'expirydate', 'expires', 'enddate', 'validtill', 'validuntil', 'validupto'],
};

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

// Turns the parsed table into rows, using the header line to find each column
export const tableToRows = (table: string[][]): { rows: RawImportRow[]; error?: string } => {
  if (table.length < 2) return { rows: [], error: 'The file has no member rows.' };

  const header = table[0].map(normalizeHeader);
  const index = {} as Record<keyof RawImportRow, number>;
  const missing: string[] = [];

  (Object.keys(HEADER_ALIASES) as (keyof RawImportRow)[]).forEach((key) => {
    index[key] = header.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (index[key] === -1 && key !== 'email') missing.push(key);
  });

  if (missing.length > 0) {
    return { rows: [], error: `Missing column(s): ${missing.join(', ')}. Use the template for the right headings.` };
  }

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
  const rows = table.slice(1).map((r) => ({
    name: cell(r, index.name),
    phone: cell(r, index.phone),
    email: cell(r, index.email),
    plan: cell(r, index.plan),
    expiry: cell(r, index.expiry),
  }));

  return { rows };
};

// ── Field checks ─────────────────────────────────────────────

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Accepts DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD and 12-Jan-2027. Day comes first (Indian style).
// Returns the date as 23:59:59 IST of that day, in ISO form, or null if it is not a real date.
export const parseExpiry = (raw: string): string | null => {
  const s = raw.trim();
  let y: number, m: number, d: number;

  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})[ /-]([A-Za-z]{3})[A-Za-z]*[ ,/-]*(\d{4})$/))) {
    d = Number(match[1]);
    m = MONTHS.indexOf(match[2].toLowerCase()) + 1;
    y = Number(match[3]);
    if (m === 0) return null;
  } else {
    return null;
  }

  if (y < 2000 || y > 2100) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;

  // 23:59:59 IST = 18:29:59 UTC the same day
  return new Date(Date.UTC(y, m - 1, d, 18, 29, 59)).toISOString();
};

// Last 10 digits, used to spot the same person twice
export const phoneKey = (phone: string): string => phone.replace(/\D/g, '').slice(-10);

// 9876543210 / 919876543210 / +91 98765 43210 all become "+91 9876543210"
export const normalizePhone = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Row validation ───────────────────────────────────────────

export const validateRows = (
  rows: RawImportRow[],
  plans: { id: string; name: string }[],
  existingPhoneKeys: Set<string>
): ValidatedRow[] => {
  const seen = new Set(existingPhoneKeys);

  return rows.map((r, i) => {
    const line = i + 2; // line 1 is the heading row
    const fail = (error: string): ValidatedRow => ({ ok: false, line, error });

    const name = r.name.trim();
    if (!name) return fail('Name is missing');
    if (name.length > 80) return fail('Name is too long');

    const phone = normalizePhone(r.phone);
    if (!phone) return fail('Phone number is not valid');

    const email = r.email.trim();
    if (email && (email.length > 120 || !EMAIL_RE.test(email))) return fail('Email is not valid');

    const plan = plans.find((p) => p.name.trim().toLowerCase() === r.plan.trim().toLowerCase());
    if (!plan) return fail(`Plan "${r.plan}" does not match any of your plans`);

    const expiresAt = parseExpiry(r.expiry);
    if (!expiresAt) return fail(`Expiry date "${r.expiry}" is not valid (use DD/MM/YYYY)`);

    const key = phoneKey(phone);
    if (seen.has(key)) return fail('This phone number is already a member');
    seen.add(key);

    return { ok: true, line, name, phone, email, planId: plan.id, expiresAt };
  });
};

export const TEMPLATE_CSV =
  'name,phone,email,plan,expiry date\n' +
  'Rahul Sharma,9876543210,rahul@example.com,Monthly,25/11/2026\n' +
  'Priya Singh,9123456780,,Yearly,14/03/2027\n';
