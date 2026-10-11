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
    title: 'Select a plan or 1-month trial',
    text: 'Activate your 1-month free trial or choose a 6-month or 1-year license with biometric integration.',
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

// Unified services across all plans: only duration and price differ
const unifiedPlanFeatures = [
  'Unlimited Gym Members & Staff Accounts',
  'Biometric Terminal & Turnstile Sync (eSSL, ZKTeco, Mantra)',
  'Dynamic Mobile QR Pass Portal for Members',
  '1-Tap WhatsApp Receipts, Expiry Alerts & Reminders',
  'Automated Billing & Sequential GST Invoicing',
  'Complete Member History Migration from Old Software / Excel',
  'Daily Encrypted Cloud Backups & Instant Restore',
  'Priority Technical & Hardware Installation Support',
];

const pricingPlans = [
  {
    id: 'trial' as PlanType,
    name: '1-Month Free Trial',
    badge: '100% Risk Free · 30 Days',
    price: '₹0',
    period: 'For 1 Full Month',
    effective: '₹0 charged today',
    setupFee: 'Setup fee deferred for 30 days',
    description: 'Experience the complete power of NeuraForge in your gym for 30 days. Full features unlocked, cancel anytime.',
    features: unifiedPlanFeatures,
    mandateNote:
      'Card or UPI Autopay details required at checkout. Renews at ₹5,000/yr (+ setup fee) after 30 days. We notify you 36 hours before deducting.',
    btnText: 'Start 1-Month Free Trial',
    popular: false,
  },
  {
    id: '6months' as PlanType,
    name: 'Semi-Annual Plan',
    badge: 'Flexible 6 Months',
    price: '₹3,000',
    period: 'For 6 Months',
    effective: 'Effective ₹500 / month',
    setupFee: '+ ₹10,000 One-Time Setup',
    description: 'Semi-annual cloud license for growing gyms with full biometric and WhatsApp automation.',
    features: unifiedPlanFeatures,
    mandateNote:
      'Base total: ₹13,000 (₹3,000 Plan + ₹10,000 One-time Setup). Apply coupon below for up to 50% OFF setup fee!',
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
    features: unifiedPlanFeatures,
    mandateNote:
      'Base total: ₹15,000 (₹5,000 Plan + ₹10,000 One-time Setup). Apply coupon below for up to 50% OFF setup fee!',
    btnText: 'Choose 1 Year (Best Value)',
    popular: true,
  },
];

const promotionalCoupons = [
  {
    code: 'SETUP50',
    discount: '50% OFF',
    saveText: 'Save ₹5,000',
    remainingFee: '₹5,000',
    tag: 'Highest Savings',
    color: 'border-secondary/40 bg-secondary/10 text-secondary',
  },
  {
    code: 'SETUP30',
    discount: '30% OFF',
    saveText: 'Save ₹3,000',
    remainingFee: '₹7,000',
    tag: 'Popular Choice',
    color: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
  },
  {
    code: 'SETUP10',
    discount: '10% OFF',
    saveText: 'Save ₹1,000',
    remainingFee: '₹9,000',
    tag: 'Instant Discount',
    color: 'border-outline/40 bg-surface-container text-on-surface-variant',
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
  const [selectedCoupon, setSelectedCoupon] = useState<string>('');
  const [copiedCoupon, setCopiedCoupon] = useState<string>('');

  const handleOpenPlan = (p: PlanType, couponCode?: string) => {
    setSelectedPlan(p);
    if (couponCode) {
      setSelectedCoupon(couponCode);
    }
    setModalOpen(true);
  };

  const handleApplyCouponFromCard = (couponCode: string) => {
    setSelectedCoupon(couponCode);
    setSelectedPlan('1year');
    setModalOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(''), 2000);
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
                phone_android
              </span>
              <span>Member Login</span>
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
              <button
                type="button"
                onClick={() => handleOpenPlan('trial')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start 1-Month Free Trial</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

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
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-sm">sell</span>
              Gym Owner Subscriptions
            </div>
            <h2 className="font-sora text-2xl sm:text-4xl font-extrabold text-on-surface">
              Simple, Transparent Plans with Identical Features
            </h2>
            <p className="mt-3 text-sm sm:text-base text-on-surface-variant">
              Every plan includes the exact same complete suite: biometrics, turnstile hardware sync, WhatsApp automation, and GST billing. Only duration and price differ.
            </p>
          </div>

          {/* Setup Fee Banner */}
          <div className="rounded-2xl border border-secondary/30 bg-surface-container-low p-5 sm:p-6 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
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
              Deferred during 1-month free trial
            </div>
          </div>

          {/* EXCLUSIVE PROMOTIONAL COUPONS SECTION (VALID TILL DEC 31) */}
          <div className="rounded-3xl border border-tertiary/40 bg-surface-container-low p-6 sm:p-8 mb-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-surface-container-high">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-2xl">confirmation_number</span>
                  <h3 className="font-sora text-base sm:text-xl font-bold text-on-surface">
                    Promotional Setup Coupons — Valid till December 31, 2026
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                  Enjoy massive savings on the additional ₹10,000 one-time onboarding fee. Each coupon can be redeemed a maximum of <strong className="text-on-surface">5 times</strong> before expiring.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-tertiary/15 text-tertiary border border-tertiary/30">
                  ⚡ 5 Uses Cap per Category
                </span>
              </div>
            </div>

            {/* Coupons 3-Column Display */}
            <div className="grid gap-4 sm:grid-cols-3">
              {promotionalCoupons.map((c) => (
                <div
                  key={c.code}
                  className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 flex flex-col justify-between hover:border-tertiary/50 transition-all shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${c.color}`}>
                        {c.discount} Setup Fee
                      </span>
                      <span className="text-[10px] text-outline font-semibold uppercase">{c.tag}</span>
                    </div>

                    <div className="my-2.5 p-2 rounded-xl bg-surface-container border border-surface-container-highest flex items-center justify-between">
                      <span className="font-mono text-sm font-black tracking-wider text-on-surface">
                        {c.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(c.code)}
                        className="text-[10px] font-bold text-secondary hover:underline cursor-pointer"
                      >
                        {copiedCoupon === c.code ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">savings</span>
                        {c.saveText} on setup fee
                      </p>
                      <p className="text-outline text-[11px]">
                        Pay setup fee: <span className="font-semibold text-on-surface">{c.remainingFee}</span> (was ₹10,000)
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-surface-container-high/60">
                    <button
                      type="button"
                      onClick={() => handleApplyCouponFromCard(c.code)}
                      className="w-full py-2.5 px-3 rounded-xl bg-surface-container hover:bg-tertiary hover:text-on-tertiary text-on-surface font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Apply & Select Plan</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
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

                  {/* Feature Checklist (Identical Across All Plans) */}
                  <div className="py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2">
                      Included in this plan:
                    </p>
                    <ul className="space-y-2.5 text-xs text-on-surface">
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
              Message us on WhatsApp for a live walkthrough, or activate your 1-month free trial right now.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => handleOpenPlan('trial')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">bolt</span>
                <span>Start 1-Month Free Trial</span>
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
        initialCouponCode={selectedCoupon}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
