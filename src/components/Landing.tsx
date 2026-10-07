import Link from 'next/link';

const WHATSAPP = '919351219914';
const DEMO_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  'Hi, I want a live demo of NeuraForge Gym OS for my gym.'
)}`;

const problems = [
  {
    icon: 'event_busy',
    title: 'Renewals slip through',
    text: 'Expiry dates sit in registers or Excel sheets. By the time someone calls, the member has already stopped coming.',
  },
  {
    icon: 'payments',
    title: 'Pending fees get forgotten',
    text: 'Who paid, who owes, and how much is scattered across paper receipts, UPI screenshots, and WhatsApp chats.',
  },
  {
    icon: 'fingerprint',
    title: 'Proxy attendance & unauthorized entries',
    text: 'Without digital QR passes or biometric hardware sync, members with expired plans enter without front desk notice.',
  },
];

const features = [
  {
    icon: 'qr_code_scanner',
    title: 'QR & Biometric Attendance',
    text: 'Instant camera QR check-in, barcode gun support, and HTTP webhook integration for eSSL, ZKTeco, and Mantra turnstiles.',
  },
  {
    icon: 'chat',
    title: '1-Tap WhatsApp Hub',
    text: 'Send payment receipts, renewal reminders, expiry alerts, and promotional announcements directly via WhatsApp.',
  },
  {
    icon: 'receipt_long',
    title: 'Billing & GST Invoicing',
    text: 'Record cash, UPI, or card payments. Automatically generate sequential tax invoices with CGST/SGST breakdowns.',
  },
  {
    icon: 'groups',
    title: 'Member Management & Freeze',
    text: 'Track active memberships, extend or freeze plans due to illness/travel, and view comprehensive attendance history.',
  },
  {
    icon: 'badge',
    title: 'Digital Member Pass Portal',
    text: 'Members log in on their phones to view their live scannable QR pass, active plan days, and payment history.',
  },
  {
    icon: 'upload_file',
    title: '1-Click Excel Import',
    text: 'Switch from Excel or your old gym software in 2 minutes. Bulk import your entire member database effortlessly.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Book a free demo',
    text: 'Message us on WhatsApp. We will set up your gym and import your members within minutes.',
  },
  {
    number: '02',
    title: 'Scan QR or Biometrics at door',
    text: 'Front desk or turnstile automatically verifies valid memberships and alerts you on expiry.',
  },
  {
    number: '03',
    title: 'Automate renewals & collections',
    text: 'Open NeuraForge every morning to see who needs renewal and collect dues in 1 tap.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'NeuraForge Gym OS',
  operatingSystem: 'Web, Android, iOS',
  applicationCategory: 'BusinessApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  description:
    'Complete Gym Management SaaS for Indian Gyms. QR check-in, biometric turnstile integration, UPI billing, and automated WhatsApp renewals.',
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Schema.org Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Responsive Top Navigation */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-surface-container-high transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-8 h-8 rounded-lg bg-primary text-on-primary font-sora font-extrabold flex items-center justify-center text-sm shadow-sm">
              NF
            </span>
            <span className="font-sora text-base sm:text-lg font-bold tracking-tight text-on-surface">
              NeuraForge <span className="text-secondary font-semibold">Gym OS</span>
            </span>
          </Link>

          {/* Action buttons (both clearly visible on mobile & desktop) */}
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/member/login"
              className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-on-surface border border-surface-container-highest hover:bg-surface-container-lowest transition-all"
            >
              Member Login
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold bg-primary text-on-primary hover:opacity-90 shadow-sm transition-all"
            >
              Gym Login
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container text-xs font-bold uppercase tracking-wider text-secondary border border-surface-container-high mb-6">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Built for Indian Gyms & Fitness Centers
            </div>

            <h1 className="font-sora text-3xl font-extrabold leading-tight text-on-surface sm:text-5xl lg:text-6xl tracking-tight">
              Stop losing members to <br className="hidden sm:inline" />
              <span className="text-secondary underline decoration-secondary/30 underline-offset-8">
                forgotten renewals
              </span>
              .
            </h1>

            <p className="mt-5 text-base sm:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Every member, active plan, UPI payment, QR check-in & biometric attendance in one place. Send renewal reminders on WhatsApp in one tap.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={DEMO_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl text-[#25D366]">chat</span>
                Book Free WhatsApp Demo
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-surface-container-highest bg-surface-container-lowest text-sm sm:text-base font-bold text-on-surface hover:bg-surface-container transition-all"
              >
                See Features & Hardware Sync
              </a>
            </div>
          </div>

          {/* Quick Access Role Switcher Cards (Optimized for Mobile Touch) */}
          <div className="mt-12 sm:mt-16 grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 sm:p-6 shadow-sm hover:border-secondary transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-bold mb-3">
                  <span className="material-symbols-outlined">fitness_center</span>
                </div>
                <h2 className="font-sora text-base sm:text-lg font-bold text-on-surface">Gym Owner & Staff Portal</h2>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5">
                  Manage memberships, record fees, verify check-ins, and send bulk WhatsApp reminders.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-surface-container-high flex items-center justify-between">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-secondary hover:underline"
                >
                  Log in to Staff Dashboard <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
                <Link href="/signup" className="text-xs text-outline font-semibold hover:text-on-surface">
                  Create Gym
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 sm:p-6 shadow-sm hover:border-secondary transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center font-bold mb-3">
                  <span className="material-symbols-outlined">badge</span>
                </div>
                <h2 className="font-sora text-base sm:text-lg font-bold text-on-surface">Member Pass & QR Portal</h2>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5">
                  Access your dynamic digital gym pass, scan at entrance, check remaining days and receipts.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-surface-container-high flex items-center justify-between">
                <Link
                  href="/member/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-tertiary hover:underline"
                >
                  Open Member Pass <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
                <span className="text-xs text-outline">Self Check-In</span>
              </div>
            </div>
          </div>
        </section>

        {/* Problems Section */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20 border-t border-surface-container-high">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <h2 className="font-sora text-2xl sm:text-3xl font-bold text-on-surface">
              Common headaches Indian gym owners face
            </h2>
            <p className="mt-2 text-sm sm:text-base text-on-surface-variant">
              Registers and Excel sheets break down when your gym grows past 50 members.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {problems.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl">{p.icon}</span>
                </div>
                <h3 className="font-sora text-base sm:text-lg font-bold text-on-surface">{p.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20 border-t border-surface-container-high">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">Complete Feature Set</p>
            <h2 className="font-sora text-2xl sm:text-4xl font-bold text-on-surface mt-2">
              Everything your gym needs, built right in
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                </div>
                <h3 className="font-sora text-base sm:text-lg font-bold text-on-surface">{f.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Steps */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20 border-t border-surface-container-high">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <h2 className="font-sora text-2xl sm:text-3xl font-bold text-on-surface">
              Get running in 3 simple steps
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-sm"
              >
                <span className="font-sora text-xl font-extrabold text-secondary">{s.number}</span>
                <h3 className="mt-3 font-sora text-base sm:text-lg font-bold text-on-surface">{s.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="rounded-3xl border border-surface-container-high bg-surface-container-lowest p-8 sm:p-14 text-center shadow-md">
            <h2 className="font-sora text-2xl sm:text-4xl font-extrabold text-on-surface">
              Ready to upgrade your gym management?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm sm:text-base text-on-surface-variant">
              Message us on WhatsApp. We will set up your account and import your existing members for free.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={DEMO_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl text-[#25D366]">chat</span>
                Book a Free WhatsApp Demo
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-surface-container-highest bg-surface-container text-sm sm:text-base font-bold text-on-surface hover:bg-surface-container-low transition-all"
              >
                Staff Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-container-high bg-surface-container-lowest py-8 text-xs text-outline">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-sora font-bold text-on-surface">NeuraForge Gym OS</span>
            <span>· All rights reserved © 2026</span>
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/login" className="hover:text-on-surface">
              Staff Login
            </Link>
            <Link href="/member/login" className="hover:text-on-surface">
              Member Login
            </Link>
            <Link href="/signup" className="hover:text-on-surface">
              Register Gym
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
