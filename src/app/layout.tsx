import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
  weight: ['400', '600', '700', '800'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#F7F4EE',
  colorScheme: 'light',
};

const title = 'NeuraForge Gym OS | Complete Gym Management Software';
const description =
  'All-in-one Gym Management Software for Indian Gyms. Manage member renewals, QR & biometric attendance, UPI/cash payments, automated WhatsApp reminders, and GST billing.';

export const metadata: Metadata = {
  metadataBase: new URL('https://neura-forge-gym.vercel.app'),
  title: {
    default: title,
    template: '%s | NeuraForge Gym OS',
  },
  description,
  keywords: [
    'gym management software',
    'gym software india',
    'biometric gym attendance',
    'qr code gym check-in',
    'gym membership management',
    'gym billing software',
    'gym whatsapp reminders',
    'gym os',
    'fitness studio software',
  ],
  authors: [{ name: 'NeuraForge' }],
  creator: 'NeuraForge',
  publisher: 'NeuraForge',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title,
    description,
    url: 'https://neura-forge-gym.vercel.app',
    siteName: 'NeuraForge Gym OS',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  alternates: {
    canonical: 'https://neura-forge-gym.vercel.app',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <head>
        {/* Preload and non-blocking load of Material Symbols */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap"
        />
      </head>
      <body className="bg-background text-on-surface antialiased selection:bg-secondary/20 selection:text-on-surface min-h-screen">
        {children}
      </body>
    </html>
  );
}
