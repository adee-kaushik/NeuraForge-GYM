'use client';

import dynamic from 'next/dynamic';
import type { CurrentUser, GymConfig } from '../config/gym';
import type { MemberRecord, MembershipPlan, TransactionRecord } from '../types';

// The dashboard is a logged-in app (no SEO needed) and shows time-relative data
// ("2 days left", "Today, 08:45 AM"), so render it only in the browser.
const App = dynamic(() => import('./App'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-background" />,
});

interface AppLoaderProps {
  gym: GymConfig;
  user: CurrentUser;
  plans: MembershipPlan[];
  members: MemberRecord[];
  transactions: TransactionRecord[];
}

export default function AppLoader({ gym, user, plans, members, transactions }: AppLoaderProps) {
  return (
    <App
      initialGym={gym}
      currentUser={user}
      plans={plans}
      initialMembers={members}
      initialTransactions={transactions}
    />
  );
}
