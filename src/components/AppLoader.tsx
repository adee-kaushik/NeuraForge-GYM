'use client';

import dynamic from 'next/dynamic';

// The dashboard is a logged-in app (no SEO needed) and shows time-relative data
// ("2 days left", "Today, 08:45 AM"), so render it only in the browser.
const App = dynamic(() => import('./App'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-background" />,
});

export default function AppLoader() {
  return <App />;
}
