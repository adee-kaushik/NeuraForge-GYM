'use client';

import dynamic from 'next/dynamic';
import type { CurrentUser, GymConfig } from '../config/gym';
import DashboardSkeleton from './DashboardSkeleton';
import type { CheckInRecord, MemberRecord, MembershipPlan, TransactionRecord } from '../types';

// The dashboard is a logged-in app (no SEO needed) and shows time-relative data
// ("2 days left", "Today, 08:45 AM"), so render it only in the browser.
const App = dynamic(() => import('./App'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

interface AppLoaderProps {
  gym: GymConfig;
  user: CurrentUser;
  plans: MembershipPlan[];
  members: MemberRecord[];
  transactions: TransactionRecord[];
  checkIns: CheckInRecord[];
}

export default function AppLoader({ gym, user, plans, members, transactions, checkIns }: AppLoaderProps) {
  return (
    <App
      initialGym={gym}
      currentUser={user}
      plans={plans}
      initialMembers={members}
      initialTransactions={transactions}
      initialCheckIns={checkIns}
    />
  );
}
