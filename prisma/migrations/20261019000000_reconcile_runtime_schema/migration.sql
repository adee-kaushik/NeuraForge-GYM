-- Reconcile missing schema through deployment, never through web requests.
-- Additive and idempotent for databases previously repaired at runtime.

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "upiId" TEXT;

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "paymentQrUrl" TEXT;

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "tagline" TEXT;

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "attendanceMode" "AttendanceMode" NOT NULL DEFAULT 'QR';

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "biometricKeyHash" TEXT;

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "clearedPrefilledPlans" BOOLEAN DEFAULT false;

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "saasPlan" TEXT NOT NULL DEFAULT 'TRIAL_14_DAYS';

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "saasStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "saasExpiresAt" TIMESTAMP(3);

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "saasApprovedAt" TIMESTAMP(3);

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "subscriptionAmount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "dob" TIMESTAMP(3);

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "timingSlot" TEXT DEFAULT 'MORNING';

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "height" DOUBLE PRECISION;

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "bmi" DOUBLE PRECISION;

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "bmiCategory" TEXT;

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER DEFAULT 0;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "gymSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MemberQuery" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberQuery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymReminder" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OwnerFeedback" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "adminReply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminMessage" (
    "id" TEXT NOT NULL,
    "gymId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Enrollment" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE IF NOT EXISTS "DietPlan" (
          "id" TEXT PRIMARY KEY,
          "gymId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "targetGoal" TEXT NOT NULL DEFAULT 'Muscle Gain',
          "caloriesTarget" INTEGER NOT NULL DEFAULT 2400,
          "proteinTarget" INTEGER NOT NULL DEFAULT 140,
          "carbsTarget" INTEGER DEFAULT 220,
          "fatsTarget" INTEGER DEFAULT 60,
          "waterLiters" DOUBLE PRECISION DEFAULT 3.5,
          "dietaryPreference" TEXT NOT NULL DEFAULT 'Non-Vegetarian',
          "mealsJson" TEXT NOT NULL,
          "supplementsRecommended" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

CREATE UNIQUE INDEX IF NOT EXISTS "Member_gymId_biometricId_key" ON "Member"("gymId", "biometricId");

CREATE INDEX IF NOT EXISTS "CouponRedemption_couponCode_idx" ON "CouponRedemption"("couponCode");

CREATE INDEX IF NOT EXISTS "MemberQuery_gymId_idx" ON "MemberQuery"("gymId");

CREATE INDEX IF NOT EXISTS "MemberQuery_memberId_idx" ON "MemberQuery"("memberId");

CREATE INDEX IF NOT EXISTS "GymReminder_gymId_idx" ON "GymReminder"("gymId");

CREATE INDEX IF NOT EXISTS "GymReminder_memberId_idx" ON "GymReminder"("memberId");

CREATE INDEX IF NOT EXISTS "OwnerFeedback_gymId_idx" ON "OwnerFeedback"("gymId");

CREATE INDEX IF NOT EXISTS "OwnerFeedback_status_idx" ON "OwnerFeedback"("status");

CREATE INDEX IF NOT EXISTS "AdminMessage_gymId_idx" ON "AdminMessage"("gymId");

CREATE INDEX IF NOT EXISTS "AdminMessage_createdAt_idx" ON "AdminMessage"("createdAt");

CREATE INDEX IF NOT EXISTS "Enrollment_gymId_idx" ON "Enrollment"("gymId");

CREATE INDEX IF NOT EXISTS "Enrollment_status_idx" ON "Enrollment"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "Device_serialNumber_key" ON "Device"("serialNumber");

CREATE INDEX IF NOT EXISTS "Device_gymId_idx" ON "Device"("gymId");

CREATE INDEX IF NOT EXISTS "BiometricPunch_gymId_punchedAt_idx" ON "BiometricPunch"("gymId", "punchedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "BiometricPunch_gymId_deviceSerial_pin_punchedAt_key" ON "BiometricPunch"("gymId", "deviceSerial", "pin", "punchedAt");

CREATE INDEX IF NOT EXISTS "BiometricLog_gymId_createdAt_idx" ON "BiometricLog"("gymId", "createdAt");

CREATE INDEX IF NOT EXISTS "BiometricLog_deviceSerial_createdAt_idx" ON "BiometricLog"("deviceSerial", "createdAt");

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemberQuery_gymId_fkey') THEN ALTER TABLE "MemberQuery" ADD CONSTRAINT "MemberQuery_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemberQuery_memberId_fkey') THEN ALTER TABLE "MemberQuery" ADD CONSTRAINT "MemberQuery_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GymReminder_gymId_fkey') THEN ALTER TABLE "GymReminder" ADD CONSTRAINT "GymReminder_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GymReminder_memberId_fkey') THEN ALTER TABLE "GymReminder" ADD CONSTRAINT "GymReminder_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OwnerFeedback_gymId_fkey') THEN ALTER TABLE "OwnerFeedback" ADD CONSTRAINT "OwnerFeedback_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminMessage_gymId_fkey') THEN ALTER TABLE "AdminMessage" ADD CONSTRAINT "AdminMessage_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Enrollment_gymId_fkey') THEN ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Device_gymId_fkey') THEN ALTER TABLE "Device" ADD CONSTRAINT "Device_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BiometricPunch_gymId_fkey') THEN ALTER TABLE "BiometricPunch" ADD CONSTRAINT "BiometricPunch_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BiometricLog_gymId_fkey') THEN ALTER TABLE "BiometricLog" ADD CONSTRAINT "BiometricLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "Gym" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "CouponRedemption" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "MemberQuery" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "GymReminder" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "OwnerFeedback" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "AdminMessage" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Device" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "BiometricPunch" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "BiometricLog" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Supplement" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "SupplementSale" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "WorkoutPlan" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "DietPlan" ENABLE ROW LEVEL SECURITY;
