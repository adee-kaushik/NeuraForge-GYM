'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SubscriptionModal, type PlanType } from './SubscriptionModal';

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
    title: 'Select a plan or free trial',
    text: 'Activate your 14-day free trial or choose a 6-month or 1-year license with biometric integration.',
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

const pricingPlans = [
  {
    id: 'trial' as PlanType,
    name: '14-Day Free Trial',
    badge: '100% Risk Free',
    price: '₹0',
    period: 'For 14 Days',
    effective: '₹0 charged today',
    setupFee: 'Setup fee deferred',
    description: 'Experience the complete power of NeuraForge in your gym. Zero risk, cancel anytime.',
    features: [
      '14 Days Full Access to All Features',
      'Unlimited Members & Records',
      'Biometric Terminal & Turnstile Sync',
      'Dynamic QR Member Passes',
      '1-Tap WhatsApp Receipts & Reminders',
      'Free Assisted Data Migration',
    ],
    mandateNote:
      'Card or UPI Autopay details required at checkout. Renews at ₹5,000/yr (+ setup fee) after 14 days. We notify you 36 hours before deducting.',
    btnText: 'Start 14-Day Free Trial',
    popular: false,
  },
  {
    id: '6months' as PlanType,
    name: 'Semi-Annual Plan',
    badge: 'Flexible License',
    price: '₹3,000',
    period: 'For 6 Months',
    effective: 'Effective ₹500 / month',
    setupFee: '+ ₹10,000 One-Time Setup',
    description: 'Perfect for established gyms looking for medium-term flexibility and cloud backups.',
    features: [
      '6 Months Complete Cloud License',
      'Multi-Device Biometric Cloud Gateway',
      'Full Billing & GST Tax Invoicing',
      'WhatsApp Automation Engine',
      'Daily Encrypted Cloud Backups',
      'Complete Member History Migration',
    ],
    mandateNote:
      'Total due at start: ₹13,000 (₹3,000 Plan + ₹10,000 One-time Onboarding & Hardware Setup). Renews at ₹3,000 every 6 months.',
    btnText: 'Choose 6 Months',
    popular: false,
  },
  {
    id: '1year' as PlanType,
    name: 'Annual License',
    badge: 'Most Popular · Best Value',
    price: '₹5,000',
    period: 'For 1 Full Year',
    effective: 'Effective ₹416 / month (Save ₹1,000)',
    setupFee: '+ ₹10,000 One-Time Setup',
    description: 'Our flagship plan for gym owners who want maximum savings, custom branding, and priority support.',
    features: [
      '1 Full Year Cloud License (Save ₹1,000)',
      'All Multi-Device Biometric & Turnstile Sync',
      'WhatsApp Automation & Custom Alerts',
      'Custom Gym Logo & Theme on Member Pass',
      'Dedicated Account Manager & Hardware Support',
      'Complete Historical Data Migration from Old Software',
    ],
    mandateNote:
      'Total due at start: ₹15,000 (₹5,000 Plan + ₹10,000 One-time Onboarding & Hardware Setup). Renews at ₹5,000 annually.',
    btnText: 'Choose 1 Year (Best Value)',
    popular: true,
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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('1year');

  const handleOpenPlan = (p: PlanType) => {
    setSelectedPlan(p);
    setModalOpen(true);
  };

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

          {/* Navigation items: Pricing link + ONLY Member Login button (free for members) */}
          <nav className="flex items-center gap-3 sm:gap-4">
            <a
              href="#pricing"
              className="text-xs sm:text-sm font-semibold text-outline hover:text-on-surface transition-colors"
            >
              Pricing & Plans
            </a>
            <Link
              href="/member/login"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base">badge</span>
              <span>Member Login</span>
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
              <button
                type="button"
                onClick={() => handleOpenPlan('trial')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">bolt</span>
                Start 14-Day Free Trial (₹0)
              </button>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-surface-container-highest bg-surface-container-lowest text-sm sm:text-base font-bold text-on-surface hover:bg-surface-container transition-all"
              >
                View Plans & Pricing
              </a>
            </div>
          </div>

          {/* Quick Access Role Cards */}
          <div className="mt-12 sm:mt-16 grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
            {/* Gym Owner Plan Activation Card */}
            <div className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 sm:p-6 shadow-sm hover:border-secondary transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-bold mb-3">
                  <span className="material-symbols-outlined">fitness_center</span>
                </div>
                <h2 className="font-sora text-base sm:text-lg font-bold text-on-surface">Gym Owner Portal</h2>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5">
                  Activate your gym subscription or 14-day free trial. Manage memberships, biometrics, fees, and WhatsApp renewals.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-surface-container-high flex items-center justify-between">
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-secondary hover:underline"
                >
                  View Subscription Plans <span className="material-symbols-outlined text-base">arrow_forward</span>
                </a>
                <Link href="/login" className="text-xs text-outline font-semibold hover:text-on-surface">
                  Subscriber Login
                </Link>
              </div>
            </div>

            {/* Member Pass Portal Card */}
            <div className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 sm:p-6 shadow-sm hover:border-secondary transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center font-bold mb-3">
                  <span className="material-symbols-outlined">badge</span>
                </div>
                <h2 className="font-sora text-base sm:text-lg font-bold text-on-surface">Member Digital Pass</h2>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5">
                  Gym members never pay for pass access. Log in to view your live dynamic QR pass, active plan days, and payment receipts.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-surface-container-high flex items-center justify-between">
                <Link
                  href="/member/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-tertiary hover:underline"
                >
                  Open Member Pass <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
                <span className="text-xs text-outline font-semibold">100% Free for Members</span>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING & SUBSCRIPTION PLANS SECTION */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 border-t border-surface-container-high scroll-mt-12">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-sm">sell</span>
              Gym Owner Subscriptions
            </div>
            <h2 className="font-sora text-2xl sm:text-4xl font-extrabold text-on-surface">
              Simple, High-ROI Plans for Your Gym
            </h2>
            <p className="mt-3 text-sm sm:text-base text-on-surface-variant">
              Every plan includes full biometric hardware sync, QR digital passes, and WhatsApp automation.
            </p>
          </div>

          {/* Setup Fee Banner */}
          <div className="rounded-2xl border border-secondary/30 bg-surface-container-low p-5 sm:p-6 mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">handshake</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                    One-Time Onboarding & Hardware Setup: ₹10,000
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/20 text-secondary uppercase">
                    One-Time Only
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-2xl">
                  Includes remote cloud ADMS setup of your eSSL / ZKTeco biometric terminals, historical member data migration from your old software or Excel, WhatsApp template approvals, and dedicated onboarding manager assistance.
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-outline shrink-0 bg-surface-container px-3 py-1.5 rounded-lg border border-surface-container-high">
              Deferred during 14-day free trial
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((p) => (
              <div
                key={p.id}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                  p.popular
                    ? 'bg-surface-container-lowest border-2 border-secondary shadow-[0_0_35px_rgba(123,208,255,0.18)]'
                    : 'bg-surface-container-lowest border border-surface-container-high shadow-sm hover:border-surface-container-highest'
                }`}
              >
                {/* Popular Ribbon */}
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-secondary text-[#001f28] text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                    {p.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-outline">
                      {p.name}
                    </span>
                    {!p.popular && (
                      <span className="px-2 py-0.5 rounded bg-surface-container text-outline text-[10px] font-bold">
                        {p.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-sora text-3xl sm:text-4xl font-extrabold text-on-surface">
                      {p.price}
                    </span>
                    <span className="text-xs text-outline font-semibold">{p.period}</span>
                  </div>

                  <p className="text-xs font-bold text-secondary mb-1">{p.effective}</p>
                  <p className="text-[11px] text-outline mb-4">{p.setupFee}</p>

                  <p className="text-xs text-on-surface-variant leading-relaxed pb-5 border-b border-surface-container-high">
                    {p.description}
                  </p>

                  {/* Feature Checklist */}
                  <ul className="space-y-2.5 py-5 text-xs text-on-surface">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-tertiary text-base shrink-0">
                          check_circle
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-surface-container-high space-y-3">
                  <div className="p-2.5 rounded-xl bg-surface-container text-[11px] text-outline leading-tight">
                    {p.mandateNote}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPlan(p.id)}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 ${
                      p.popular
                        ? 'bg-secondary text-[#001f28] hover:opacity-90 font-extrabold'
                        : 'bg-primary text-on-primary hover:opacity-90'
                    }`}
                  >
                    <span>{p.btnText}</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-outline">
              Already have an active gym subscription?{' '}
              <Link href="/login" className="text-secondary font-bold hover:underline">
                Log in to Gym Staff Portal
              </Link>
            </p>
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
              Message us on WhatsApp for a live walkthrough, or activate your 14-day free trial right now.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => handleOpenPlan('trial')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">bolt</span>
                Start 14-Day Free Trial (₹0)
              </button>
              <a
                href={DEMO_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-surface-container-highest bg-surface-container text-sm sm:text-base font-bold text-on-surface hover:bg-surface-container-low transition-all"
              >
                <span className="material-symbols-outlined text-xl text-[#25D366]">chat</span>
                Book WhatsApp Demo
              </a>
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
            <a href="#pricing" className="hover:text-on-surface">
              Pricing Plans
            </a>
            <Link href="/member/login" className="hover:text-on-surface">
              Member Pass Portal
            </Link>
            <Link href="/login" className="hover:text-on-surface">
              Gym Staff Login
            </Link>
          </div>
        </div>
      </footer>

      {/* Subscription & Mandate Activation Modal */}
      <SubscriptionModal
        isOpen={modalOpen}
        selectedPlan={selectedPlan}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
