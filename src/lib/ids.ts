// Temporary ID generator for the frontend-only phase.
// Sequential per prefix so IDs never collide. The database replaces this later.

export const nextId = (existing: string[], prefix: string, start: number, pad = 0): string => {
  const max = existing.reduce((acc, id) => {
    const n = parseInt(id.replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, start - 1);
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
};

export const invoiceFor = (txnId: string, date: Date): string =>
  `INV-${date.getFullYear()}-${txnId.replace(/\D/g, '')}`;

// Next invoice number for a year, e.g. INV-2026-0007 -> INV-2026-0008
export const nextInvoiceNo = (existing: string[], year: number): string => {
  const prefix = `INV-${year}-`;
  const max = existing.reduce((acc, no) => {
    if (!no.startsWith(prefix)) return acc;
    const n = parseInt(no.slice(prefix.length), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
};
