import { prisma } from './prisma';

let initPromise: Promise<void> | null = null;

/**
 * Ensures the PostgreSQL database has all required columns.
 * Runs once at startup/first request and caches the result.
 */
export function ensureDatabaseSchema(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "timingSlot" TEXT DEFAULT 'MORNING';
          ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;
          ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "height" DOUBLE PRECISION;
          ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "bmi" DOUBLE PRECISION;
          ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "bmiCategory" TEXT;
          ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER DEFAULT 0;
          ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "notes" TEXT;
        `);
      } catch (err) {
        console.warn('Auto-migration DDL warning (continuing with graceful fallback):', err);
      }
    })();
  }
  return initPromise;
}
