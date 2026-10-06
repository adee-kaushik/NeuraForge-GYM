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
