'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SubscriptionModal, type PlanType } from './SubscriptionModal';

const WHATSAPP = '919351219914';
const DEMO_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  'Hi, I want a live demo of NeuraFitness for my gym.'
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
    title: 'Select Base or Pro Plan',
    text: 'Choose our Base plan (1-month demo, 6-month or 1-year) or Pro plan with included custom personalization.',
  },
  {
    number: '02',
    title: 'Scan QR or Biometrics at door',
    text: 'Front desk or turnstile automatically verifies valid memberships and alerts you on expiry.',
  },
  {
    number: '03',
    title: 'Automate renewals & collections',
    text: 'Open NeuraFitness every morning to see who needs renewal and collect dues in 1 tap.',
  },
];

// Unified services across all plans
const unifiedPlanFeatures = [
  'Unlimited Gym Members & Staff Accounts',
  'Biometric Terminal & Turnstile Sync (eSSL, ZKTeco, Mantra)',
  'Dynamic Mobile QR Pass Portal for Members',
  '1-Tap WhatsApp Receipts, Expiry Alerts & Reminders',
  'Automated Billing & Sequential GST Invoicing',
  'Complete Member History Migration from Old Software / Excel',
];

interface PlanCardData {
  id: PlanType;
  name: string;
  tier: 'Base' | 'Pro';
  badge: string;
  price: string;
  period: string;
  bonusText?: string;
  customizationText: string;
  effectiveNote: string;
  description: string;
  features: string[];
  btnText: string;
  popular?: boolean;
}

const basePlanCards: PlanCardData[] = [
  {
    id: 'base_1m',
    name: '1 Month Demo',
    tier: 'Base',
    badge: 'Demo Access',
    price: '₹999',
    period: 'for 1 month',
    customizationText: 'No customization / modification',
    effectiveNote: 'Full demo access for your gym',
    description: '1 month full cloud demo to test all features with your gym staff and live members.',
    features: unifiedPlanFeatures,
    btnText: 'Start 1 Month Demo (₹999)',
    popular: false,
  },
  {
    id: 'base_6m',
    name: '6 Months License',
    tier: 'Base',
    badge: '6 Mo + 1 Mo Free Demo',
    price: '₹2,399',
    period: 'for 6 months',
    bonusText: '+ 1 Month Free Demo',
    customizationText: 'No customization / modification',
    effectiveNote: '7 Months total access · Effective ₹342/mo',
    description: 'Semi-annual cloud license for growing gyms with automated WhatsApp renewals & biometric sync.',
    features: unifiedPlanFeatures,
    btnText: 'Choose 6 Months (₹2,399)',
    popular: false,
  },
  {
    id: 'base_1y',
    name: '1 Year License',
    tier: 'Base',
    badge: 'Best Value · 1 Yr + 1 Mo Free Demo',
    price: '₹3,499',
    period: 'for 1 year',
    bonusText: '+ 1 Month Free Demo',
    customizationText: 'No customization / modification',
    effectiveNote: '13 Months total access · Effective ₹269/mo',
    description: 'Full year cloud license with maximum savings, full biometric sync, and GST invoicing.',
    features: unifiedPlanFeatures,
    btnText: 'Choose 1 Year (₹3,499)',
    popular: true,
  },
];

const proPlanCards: PlanCardData[] = [
  {
    id: 'pro_6m',
    name: '6 Months Pro',
    tier: 'Pro',
    badge: '1 Customization Free',
    price: '₹3,499',
    period: 'for 6 months',
    bonusText: '⭐ 1 Customization Free Included',
    customizationText: 'Customization & Personalization',
    effectiveNote: 'Tailored features + Personalization included',
    description: 'Semi-annual pro license with 1 bespoke software customization and gym personalization included.',
    features: [
      'Everything in Base Plan included',
      '1 Free Customization & Personalization included',
      'Custom Brand Styling & Member Pass Theme',
      'Priority Turnstile & Biometric ADMS Support',
      'Dedicated WhatsApp Integration Assistance',
    ],
    btnText: 'Choose Pro 6 Months (₹3,499)',
    popular: false,
  },
  {
    id: 'pro_1y',
    name: '1 Year Pro',
    tier: 'Pro',
    badge: '2 Customizations Free · Elite',
    price: '₹5,499',
    period: 'for 1 year',
    bonusText: '⭐ 2 Customizations Free Included',
    customizationText: 'Customization & Personalization',
    effectiveNote: 'Tailored features + Personalization included',
    description: 'Our flagship tier for gyms wanting tailored workflows, 2 bespoke customizations, and priority engineering.',
    features: [
      'Everything in Base Plan included',
      '2 Free Customizations & Personalizations included',
      'Full Gym Branding & Custom Feature Enhancements',
      'Direct Developer White-glove Onboarding',
      'Priority 24/7 SLA Support',
    ],
    btnText: 'Choose Pro 1 Year (₹5,499)',
    popular: true,
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'NeuraFitness',
  operatingSystem: 'Web, Android, iOS',
  applicationCategory: 'BusinessApplication',
  offers: {
    '@type': 'Offer',
    price: '999',
    priceCurrency: 'INR',
  },
  description:
    'Complete Gym Management SaaS for Indian Gyms. QR check-in, biometric turnstile integration, UPI billing, and automated WhatsApp renewals.',
};

export default function Landing() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('base_1y');
  const [selectedTierTab, setSelectedTierTab] = useState<'base' | 'pro'>('base');
  const [selectedCoupon, setSelectedCoupon] = useState<string>('');

  const handleOpenPlan = (p: PlanType, couponCode?: string) => {
    setSelectedPlan(p);
    if (couponCode) {
      setSelectedCoupon(couponCode);
    }
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
          <Link href="/" className="flex items-center group">
            <img
              src="/logo.png"
              alt="NeuraFitness"
              className="h-8 sm:h-9.5 w-auto object-contain"
            />
          </Link>

          {/* Navigation items: Pricing link + ONLY Login button */}
          <nav className="flex items-center gap-3 sm:gap-4">
            <a
              href="#pricing"
              className="text-xs sm:text-sm font-semibold text-outline hover:text-on-surface transition-colors"
            >
              Pricing & Plans
            </a>
            <a
              href="#features"
              className="hidden sm:inline-block text-xs sm:text-sm font-semibold text-outline hover:text-on-surface transition-colors"
            >
              Features
            </a>
            <Link
              href="/member/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-surface-container-highest bg-surface-container-lowest text-xs sm:text-sm font-bold text-on-surface hover:border-secondary hover:text-secondary transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm sm:text-base text-secondary">
                login
              </span>
              <span>Login</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <div className="space-y-16 sm:space-y-24">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:pt-20 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Built for Modern Indian Gyms · Biometrics, Turnstiles & QR
            </div>

            <h1 className="font-sora text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-on-surface leading-[1.15]">
              Run your entire gym on autopilot.{' '}
              <span className="text-secondary underline decoration-secondary/30 underline-offset-8">
                Zero missed renewals.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Replace Excel sheets with automated WhatsApp reminders, turnstile biometric integration, dynamic QR member passes, and GST billing.
            </p>

            {/* Direct CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <a
                href="#pricing"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Plans (From ₹999)</span>
                <span className="material-symbols-outlined text-lg">arrow_downward</span>
              </a>

              <a
                href={DEMO_LINK}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-surface-container-highest bg-surface-container-lowest text-on-surface text-sm sm:text-base font-bold hover:border-secondary hover:text-secondary active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg text-[#25D366]">chat</span>
                <span>Book Live WhatsApp Walkthrough</span>
              </a>
            </div>

            {/* Members Quick Access Notice */}
            <div className="pt-2 text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-container-low border border-surface-container-high">
                <span className="material-symbols-outlined text-tertiary text-base">badge</span>
                <span className="text-xs text-on-surface-variant">Are you a gym member?</span>
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
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-sm">sell</span>
              Gym Owner Subscriptions
            </div>
            <h2 className="font-sora text-2xl sm:text-4xl font-extrabold text-on-surface">
              Simple, Transparent Pricing Built for Gyms
            </h2>
            <p className="mt-3 text-sm sm:text-base text-on-surface-variant">
              Select between our turnkey <strong className="text-on-surface">Base Plan</strong> (standard software, no modifications) or <strong className="text-on-surface">Pro Plan</strong> (includes free customizations and full brand personalization).
            </p>

            {/* Plan Tier Switcher Tabs */}
            <div className="flex items-center justify-center mt-6">
              <div className="inline-flex p-1.5 rounded-2xl bg-surface-container border border-surface-container-high shadow-xs">
                <button
                  type="button"
                  onClick={() => setSelectedTierTab('base')}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    selectedTierTab === 'base'
                      ? 'bg-secondary text-[#001f28] shadow-sm font-extrabold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">layers</span>
                  <span>1. Base Plan</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/10 font-bold uppercase">
                    No Customization
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTierTab('pro')}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    selectedTierTab === 'pro'
                      ? 'bg-secondary text-[#001f28] shadow-sm font-extrabold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">palette</span>
                  <span>2. Pro Plan</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/10 font-bold uppercase">
                    Free Customization
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Tier Highlight Banner */}
          {selectedTierTab === 'base' ? (
            <div className="rounded-2xl border border-outline/20 bg-surface-container-low p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">bolt</span>
                </div>
                <div>
                  <h4 className="font-sora text-sm font-bold text-on-surface">
                    Base Plan: Standard Cloud Suite (No Customization / Modification)
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Ready immediately out of the box with complete biometric sync, QR passes, WhatsApp receipts, and GST billing.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-bold bg-surface-container border border-surface-container-high text-outline">
                Zero Setup Fee · Instant Cloud Setup
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-secondary/30 bg-surface-container-low p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">auto_fix_high</span>
                </div>
                <div>
                  <h4 className="font-sora text-sm font-bold text-on-surface">
                    Pro Plan: Customization & Personalization Included
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Tailored software workflows, gym-specific tweaks, and direct developer engineering. Includes 1-2 free customizations!
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-extrabold bg-secondary/20 text-secondary border border-secondary/30">
                ⭐ Free Bespoke Customization
              </span>
            </div>
          )}

          {/* Pricing Grid */}
          <div
            className={`grid gap-6 ${
              selectedTierTab === 'base' ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl mx-auto'
            }`}
          >
            {(selectedTierTab === 'base' ? basePlanCards : proPlanCards).map((p) => (
              <div
                key={p.id}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                  p.popular
                    ? 'bg-surface-container-lowest border-2 border-secondary shadow-[0_0_35px_rgba(123,208,255,0.18)]'
                    : 'bg-surface-container-lowest border border-surface-container-high shadow-sm hover:border-surface-container-highest'
                }`}
              >
                {/* Popular / Promo Ribbon */}
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

                  {p.bonusText && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary text-xs font-bold mb-2">
                      <span className="material-symbols-outlined text-xs">redeem</span>
                      <span>{p.bonusText}</span>
                    </div>
                  )}

                  <p className="text-xs font-bold text-secondary mb-1">{p.effectiveNote}</p>
                  <p className="text-[11px] text-outline mb-4 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">
                      {p.tier === 'Base' ? 'block' : 'verified'}
                    </span>
                    <span>{p.customizationText}</span>
                  </p>

                  <p className="text-xs text-on-surface-variant leading-relaxed pb-5 border-b border-surface-container-high">
                    {p.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="py-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2.5">
                      Included in this license:
                    </p>
                    <ul className="space-y-2.5 text-xs text-on-surface">
                      {p.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-tertiary text-base shrink-0">
                            check_circle
                          </span>
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-container-high space-y-3">
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

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-outline text-center">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-tertiary text-sm">check_circle</span>
              UPI, Netbanking & Cards accepted
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-tertiary text-sm">lock</span>
              Instant cloud activation
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-tertiary text-sm">support_agent</span>
              WhatsApp onboarding support
            </span>
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
              Message us on WhatsApp for a live walkthrough, or start your 1-month demo right now.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => handleOpenPlan('base_1m')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">bolt</span>
                <span>Start 1-Month Demo (₹999)</span>
              </button>
              <a
                href={DEMO_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-surface-container-highest bg-surface-container-lowest text-on-surface text-sm sm:text-base font-bold hover:border-secondary hover:text-secondary transition-all"
              >
                <span className="material-symbols-outlined text-xl text-[#25D366]">chat</span>
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-surface-container-high bg-surface-container-lowest/50 py-8 text-xs text-outline">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.png"
              alt="NeuraFitness"
              className="w-6 h-6 rounded-md object-contain border border-surface-container-high"
            />
            <span className="font-sora font-bold text-on-surface">NeuraFitness</span>
            <span>· All rights reserved © 2026</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 font-semibold flex-wrap justify-center">
            <a href="#pricing" className="hover:text-on-surface">
              Pricing Plans
            </a>
            <Link href="/member/login" className="hover:text-on-surface">
              Member Pass Portal
            </Link>
            <Link href="/login" className="hover:text-on-surface">
              Gym Staff Login
            </Link>
            <Link href="/admin/login" className="text-secondary hover:text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">shield</span>
              Admin Login
            </Link>
          </div>
        </div>
      </footer>

      {/* Subscription & Mandate Activation Modal */}
      <SubscriptionModal
        isOpen={modalOpen}
        selectedPlan={selectedPlan}
        initialCouponCode={selectedCoupon}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
