import type { Metadata } from 'next';
import './globals.css';

const description =
  'Tactical gym management system OS with biometric gates, hunter rank tiers, revenue quests, and automated WhatsApp dispatch.';

export const metadata: Metadata = {
  title: 'Iron Pulse Gym OS',
  description,
  openGraph: { title: 'Iron Pulse Gym OS', description, type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface antialiased selection:bg-secondary/30 selection:text-on-surface">
        {children}
      </body>
    </html>
  );
}
