import AppLoader from '@/components/AppLoader';
import Landing from '@/components/Landing';
import { getCurrentStaff } from '@/lib/auth';
import { toCurrentUser, toGymConfig } from '@/lib/session';
import { getPlansForGym } from '@/lib/plans';
import { loadCheckInRecords, loadMemberRecords, loadTransactionRecords } from '@/lib/data';

export default async function Page() {
  // Logged-in owner/staff get the dashboard. Everyone else sees the public landing page.
  const staff = await getCurrentStaff();
  if (!staff) return <Landing />;

  const [plans, members, transactions, checkIns] = await Promise.all([
    getPlansForGym(staff.gymId),
    loadMemberRecords(staff.gymId),
    loadTransactionRecords(staff.gymId),
    loadCheckInRecords(staff.gymId),
  ]);

  return (
    <AppLoader
      gym={toGymConfig(staff.gym)}
      user={toCurrentUser(staff)}
      plans={plans}
      members={members}
      transactions={transactions}
      checkIns={checkIns}
    />
  );
}
