CREATE TYPE "AttendanceMode" AS ENUM ('QR', 'BIOMETRIC');

ALTER TABLE "Gym"
  ADD COLUMN "attendanceMode" "AttendanceMode" NOT NULL DEFAULT 'QR',
  ADD COLUMN "biometricKeyHash" TEXT;