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

          CREATE TABLE IF NOT EXISTS "Supplement" (
            "id" TEXT PRIMARY KEY,
            "gymId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "brand" TEXT,
            "category" TEXT NOT NULL DEFAULT 'Protein',
            "price" INTEGER NOT NULL DEFAULT 0,
            "costPrice" INTEGER,
            "stock" INTEGER NOT NULL DEFAULT 0,
            "unit" TEXT DEFAULT 'units',
            "flavor" TEXT,
            "description" TEXT,
            "imageUrl" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS "SupplementSale" (
            "id" TEXT PRIMARY KEY,
            "gymId" TEXT NOT NULL,
            "supplementId" TEXT,
            "supplementName" TEXT NOT NULL,
            "customerName" TEXT NOT NULL,
            "customerPhone" TEXT,
            "quantity" INTEGER NOT NULL DEFAULT 1,
            "unitPrice" INTEGER NOT NULL,
            "totalAmount" INTEGER NOT NULL,
            "paymentMode" TEXT NOT NULL DEFAULT 'UPI',
            "notes" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS "WorkoutPlan" (
            "id" TEXT PRIMARY KEY,
            "gymId" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "description" TEXT,
            "difficulty" TEXT NOT NULL DEFAULT 'Intermediate',
            "daysPerWeek" INTEGER NOT NULL DEFAULT 4,
            "goal" TEXT NOT NULL DEFAULT 'Muscle Hypertrophy',
            "routineJson" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS "Enrollment" (
            "id" TEXT PRIMARY KEY,
            "gymId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "phone" TEXT NOT NULL,
            "email" TEXT,
            "gender" TEXT,
            "dob" TIMESTAMP(3),
            "planId" TEXT NOT NULL,
            "planName" TEXT NOT NULL,
            "timingSlot" TEXT DEFAULT 'MORNING',
            "weight" DOUBLE PRECISION,
            "height" DOUBLE PRECISION,
            "bmi" DOUBLE PRECISION,
            "bmiCategory" TEXT,
            "amount" INTEGER NOT NULL DEFAULT 0,
            "utrNumber" TEXT,
            "paymentStatus" TEXT NOT NULL DEFAULT 'PAID_PENDING_VERIFICATION',
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "notes" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS "Enrollment_gymId_idx" ON "Enrollment"("gymId");
          CREATE INDEX IF NOT EXISTS "Enrollment_status_idx" ON "Enrollment"("status");
        `);
      } catch (err) {
        console.warn('Auto-migration DDL warning (continuing with graceful fallback):', err);
      }
    })();
  }
  return initPromise;
}
