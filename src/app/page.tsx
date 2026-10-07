import { redirect } from 'next/navigation';
import AppLoader from '@/components/AppLoader';
import { getCurrentStaff } from '@/lib/auth';
import { toCurrentUser, toGymConfig } from '@/lib/session';
import { getPlansForGym } from '@/lib/plans';
import { loadMemberRecords, loadTransactionRecords } from '@/lib/data';

export default async function Page() {
  // Dashboard is for logged-in owner/staff only
  const staff = await getCurrentStaff();
  if (!staff) redirect('/login');

  const [plans, members, transactions] = await Promise.all([
    getPlansForGym(staff.gymId),
    loadMemberRecords(staff.gymId),
    loadTransactionRecords(staff.gymId),
  ]);

  return (
    <AppLoader
      gym={toGymConfig(staff.gym)}
      user={toCurrentUser(staff)}
      plans={plans}
      members={members}
      transactions={transactions}
    />
  );
}
