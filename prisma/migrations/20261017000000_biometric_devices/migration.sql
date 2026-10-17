-- Biometric devices: numeric machine ID per member, registered devices, raw punch store and activity log.
-- Written to be safe to run more than once (IF NOT EXISTS), because earlier migrations in this project
-- do not cover every column that exists in the live database.

-- 1) Per-member numeric ID used on the machine
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "biometricId" INTEGER;

-- Existing members keep their number when their code already looks like one (307, MEM-307, MEM-007) and it is unique in the gym.
WITH cand AS (
  SELECT id, "gymId", "createdAt",
         substring("memberCode" from '(?i)^(?:MEM-?)?([0-9]{1,9})$')::int AS num
  FROM "Member"
  WHERE "biometricId" IS NULL AND "memberCode" ~* '^(MEM-?)?[0-9]{1,9}$'
), ranked AS (
  SELECT id, num,
         ROW_NUMBER() OVER (PARTITION BY "gymId", num ORDER BY "createdAt", id) AS rn
  FROM cand
)
UPDATE "Member" m
SET "biometricId" = r.num
FROM ranked r
WHERE m.id = r.id AND r.rn = 1 AND r.num > 0
  AND NOT EXISTS (
    SELECT 1 FROM "Member" x WHERE x."gymId" = m."gymId" AND x."biometricId" = r.num
  );

-- Everyone else gets the next free numbers in the gym, oldest member first.
WITH mx AS (
  SELECT "gymId", COALESCE(MAX("biometricId"), 0) AS m FROM "Member" GROUP BY "gymId"
), todo AS (
  SELECT id, "gymId",
         ROW_NUMBER() OVER (PARTITION BY "gymId" ORDER BY "createdAt", id) AS rn
  FROM "Member" WHERE "biometricId" IS NULL
)
UPDATE "Member" m
SET "biometricId" = mx.m + todo.rn
FROM todo JOIN mx ON mx."gymId" = todo."gymId"
WHERE m.id = todo.id;

CREATE UNIQUE INDEX IF NOT EXISTS "Member_gymId_biometricId_key" ON "Member"("gymId", "biometricId");

-- 2) Registered machines
CREATE TABLE IF NOT EXISTS "Device" (
  "id"           TEXT PRIMARY KEY,
  "gymId"        TEXT NOT NULL REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "serialNumber" TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "protocol"     TEXT NOT NULL DEFAULT 'ADMS',
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt"   TIMESTAMP(3),
  "lastIp"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Device_serialNumber_key" ON "Device"("serialNumber");
CREATE INDEX IF NOT EXISTS "Device_gymId_idx" ON "Device"("gymId");

-- 3) Raw punches (idempotent: the same punch re-sent by a machine is stored once)
CREATE TABLE IF NOT EXISTS "BiometricPunch" (
  "id"           TEXT PRIMARY KEY,
  "gymId"        TEXT NOT NULL REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "deviceSerial" TEXT NOT NULL DEFAULT '',
  "pin"          TEXT NOT NULL,
  "memberId"     TEXT,
  "punchedAt"    TIMESTAMP(3) NOT NULL,
  "verifyType"   TEXT,
  "verifyCode"   INTEGER,
  "source"       TEXT NOT NULL DEFAULT 'ADMS',
  "result"       TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "BiometricPunch_gymId_deviceSerial_pin_punchedAt_key"
  ON "BiometricPunch"("gymId", "deviceSerial", "pin", "punchedAt");
CREATE INDEX IF NOT EXISTS "BiometricPunch_gymId_punchedAt_idx" ON "BiometricPunch"("gymId", "punchedAt");

-- 4) Activity log for remote debugging
CREATE TABLE IF NOT EXISTS "BiometricLog" (
  "id"           TEXT PRIMARY KEY,
  "gymId"        TEXT REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "deviceSerial" TEXT,
  "kind"         TEXT NOT NULL,
  "summary"      TEXT NOT NULL,
  "rawPreview"   TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BiometricLog_gymId_createdAt_idx" ON "BiometricLog"("gymId", "createdAt");
CREATE INDEX IF NOT EXISTS "BiometricLog_deviceSerial_createdAt_idx" ON "BiometricLog"("deviceSerial", "createdAt");

-- 5) Same rule as every other table (see enable_rls): no policies, so the public API can read and write nothing here.
ALTER TABLE "Device" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BiometricPunch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BiometricLog" ENABLE ROW LEVEL SECURITY;
