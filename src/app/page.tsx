import AppLoader from '@/components/AppLoader';
import Landing from '@/components/Landing';
import { getCurrentStaff } from '@/lib/auth';
import { toCurrentUser, toGymConfig } from '@/lib/session';
import { getPlansForGym } from '@/lib/plans';
import { loadCheckInRecords, loadMemberRecords, loadTransactionRecords } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // Logged-in owner/staff get the dashboard. Everyone else sees the public landing page.
  const staff = await getCurrentStaff().catch((err) => {
    console.error('getCurrentStaff error:', err);
    return null;
  });
  if (!staff || !staff.gym) return <Landing />;

  try {
    const [plans, members, transactions, checkIns] = await Promise.all([
      getPlansForGym(staff.gymId).catch((err) => {
        console.error('getPlansForGym error:', err);
        return [];
      }),
      loadMemberRecords(staff.gymId).catch((err) => {
        console.error('loadMemberRecords error:', err);
        return [];
      }),
      loadTransactionRecords(staff.gymId).catch((err) => {
        console.error('loadTransactionRecords error:', err);
        return [];
      }),
      loadCheckInRecords(staff.gymId).catch((err) => {
        console.error('loadCheckInRecords error:', err);
        return [];
      }),
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
  } catch (error) {
    console.error('Error loading dashboard page:', error);
    return (
      <AppLoader
        gym={toGymConfig(staff.gym)}
        user={toCurrentUser(staff)}
        plans={[]}
        members={[]}
        transactions={[]}
        checkIns={[]}
      />
    );
  }
}
