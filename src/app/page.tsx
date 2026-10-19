import { subscriptionActive } from '@/lib/subscription';
import { logout } from '@/app/login/actions';
import AppLoader from '@/components/AppLoader';
import Landing from '@/components/Landing';
import { getCurrentStaff } from '@/lib/auth';
import { toCurrentUser, toGymConfig } from '@/lib/session';
import { getPlansForGym } from '@/lib/plans';
import { loadCheckInRecords, loadMemberRecords, loadTransactionRecords } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // Logged-in owner/staff get the dashboard. Everyone else sees the public landing page.
  const staff = await getCurrentStaff();
  if (!staff?.gym) return <Landing />;
  if (!subscriptionActive(staff.gym)) return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background text-on-surface text-center">
      <h1 className="text-2xl font-bold">Your gym subscription needs attention</h1>
      <p>{staff.gym.saasStatus === 'PENDING_APPROVAL' ? 'Your registration is saved. Access will open after payment verification.' : 'Your subscription is expired or suspended. Contact support to restore access.'}</p>
      <a href="https://wa.me/919351219914" className="rounded-xl px-6 py-3 bg-primary text-on-primary">Contact NeuraFitness support</a>
      <form action={logout}><button type="submit">Sign out</button></form>
    </main>
  );
  const [plans, members, transactions, checkIns] = await Promise.all([
    getPlansForGym(staff.gymId), loadMemberRecords(staff.gymId),
    loadTransactionRecords(staff.gymId), loadCheckInRecords(staff.gymId),
  ]);
  return <AppLoader gym={toGymConfig(staff.gym)} user={toCurrentUser(staff)} plans={plans} members={members} transactions={transactions} checkIns={checkIns} />;
}
