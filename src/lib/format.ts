// Date / money helpers. Backend will send ISO strings; UI formats them here.

const MS_DAY = 86400000;

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, days: number): Date => new Date(d.getTime() + days * MS_DAY);

export const addMonths = (d: Date, months: number): Date => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
};

/** Whole days from today (local midnight) to the given ISO date. Negative = already passed. */
export const daysUntil = (iso: string, now: Date = new Date()): number =>
  Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / MS_DAY);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 26 Oct 2026 */
export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** 08:45 AM */
export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

/** "Today, 08:45 AM" / "Yesterday, 05:15 PM" / "22 Oct, 11:20 AM" */
export const formatTimestamp = (iso: string, now: Date = new Date()): string => {
  const diff = daysUntil(iso, now);
  if (diff === 0) return `Today, ${formatTime(iso)}`;
  if (diff === -1) return `Yesterday, ${formatTime(iso)}`;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}, ${formatTime(iso)}`;
};

export const isSameDay = (a: string | Date, b: Date = new Date()): boolean =>
  startOfDay(new Date(a)).getTime() === startOfDay(b).getTime();

export const isSameMonth = (a: string | Date, b: Date = new Date()): boolean => {
  const d = new Date(a);
  return d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth();
};

export const inr = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Prices are GST-inclusive: GST part of a total amount. e.g. 18500 @18% -> 2822 */
export const gstIncluded = (total: number, ratePercent: number): number =>
  Math.round((total * ratePercent) / (100 + ratePercent));

// Gyms are in India for now, so "today" on the server means today in IST (UTC+5:30),
// not the server's own timezone (Vercel runs in UTC).
const IST_OFFSET_MS = 330 * 60000;

export const startOfDayIST = (now: Date = new Date()): Date => {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  const utcMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(utcMidnight - IST_OFFSET_MS);
};
