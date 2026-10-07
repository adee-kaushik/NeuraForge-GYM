-- Turn on row-level security for every app table.
-- There are no policies on purpose: Supabase's public API (which uses the publishable key) can then
-- read and write nothing here. The app reads and writes through Prisma with the database owner login,
-- which is not affected. Any table added later needs the same line.
ALTER TABLE "Gym" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
