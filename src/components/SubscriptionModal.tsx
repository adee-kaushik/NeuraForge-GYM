'use client';

import React, { useState, useEffect, useRef } from 'react';
import { prepareGymEnquiry } from '@/lib/gym-enquiry';

export type PlanType =
  | 'base_1m'
  | 'base_6m'
  | 'base_1y'
  | 'pro_6m'
  | 'pro_1y'
  | 'monthly'
  | '6months'
  | '1year'
  | 'trial';

interface SubscriptionModalProps {
  isOpen: boolean;
  selectedPlan: PlanType;
  onClose: () => void;
}

const PLAN_DETAILS: Record<
  PlanType,
  {
    name: string;
    tier: 'BASE' | 'PRO';
    priceLabel: string;
    basePrice: number;
    periodLabel: string;
    setupFee: number;
    bonusText?: string;
    customizationNote: string;
    billingNotice: string;
  }
> = {
  base_1m: {
    name: 'Base Plan: 1 Month Demo',
    tier: 'BASE',
    priceLabel: '₹999',
    basePrice: 999,
    periodLabel: '1 Month Full Demo',
    setupFee: 0,
    customizationNote: 'No customization / modification',
    billingNotice:
      'Base Plan: 1 Month Demo for ₹999. Standard full cloud suite (no customization / modification).',
  },
  base_6m: {
    name: 'Base Plan: 6 Months',
    tier: 'BASE',
    priceLabel: '₹2,399',
    basePrice: 2399,
    periodLabel: '6 Months + 1 Month Free Demo (7 Months Total)',
    setupFee: 0,
    bonusText: '+ 1 Month Free Demo',
    customizationNote: 'No customization / modification',
    billingNotice:
      'Base Plan: 6 Months for ₹2,399 + 1 Month Free Demo. Standard full cloud suite (no customization / modification).',
  },
  base_1y: {
    name: 'Base Plan: 1 Year',
    tier: 'BASE',
    priceLabel: '₹3,499',
    basePrice: 3499,
    periodLabel: '1 Year + 1 Month Free Demo (13 Months Total)',
    setupFee: 0,
    bonusText: '+ 1 Month Free Demo',
    customizationNote: 'No customization / modification',
    billingNotice:
      'Base Plan: 1 Year for ₹3,499 + 1 Month Free Demo. Standard full cloud suite (no customization / modification).',
  },
  pro_6m: {
    name: 'Pro Plan: 6 Months',
    tier: 'PRO',
    priceLabel: '₹3,499',
    basePrice: 3499,
    periodLabel: '6 Months Pro License',
    setupFee: 0,
    customizationNote: '1 Customization Free & Full Personalization',
    billingNotice:
      'Pro Plan: 6 Months for ₹3,499 with 1 free software customization and gym personalization included.',
  },
  pro_1y: {
    name: 'Pro Plan: 1 Year',
    tier: 'PRO',
    priceLabel: '₹5,499',
    basePrice: 5499,
    periodLabel: '1 Year Pro License',
    setupFee: 0,
    customizationNote: '2 Customizations Free & Full Personalization',
    billingNotice:
      'Pro Plan: 1 Year for ₹5,499 with 2 free software customizations and gym personalization included.',
  },
  monthly: {
    name: 'Base Plan: 1 Month Demo',
    tier: 'BASE',
    priceLabel: '₹999',
    basePrice: 999,
    periodLabel: '1 Month Full Demo',
    setupFee: 0,
    customizationNote: 'No customization / modification',
    billingNotice: 'Base Plan: 1 Month Demo for ₹999.',
  },
  '6months': {
    name: 'Base Plan: 6 Months',
    tier: 'BASE',
    priceLabel: '₹2,399',
    basePrice: 2399,
    periodLabel: '6 Months + 1 Month Free Demo (7 Months Total)',
    setupFee: 0,
    bonusText: '+ 1 Month Free Demo',
    customizationNote: 'No customization / modification',
    billingNotice: 'Base Plan: 6 Months for ₹2,399 + 1 Month Free Demo.',
  },
  '1year': {
    name: 'Base Plan: 1 Year',
    tier: 'BASE',
    priceLabel: '₹3,499',
    basePrice: 3499,
    periodLabel: '1 Year + 1 Month Free Demo (13 Months Total)',
    setupFee: 0,
    bonusText: '+ 1 Month Free Demo',
    customizationNote: 'No customization / modification',
    billingNotice: 'Base Plan: 1 Year for ₹3,499 + 1 Month Free Demo.',
  },
  trial: {
    name: '1-Month Free Trial',
    tier: 'BASE',
    priceLabel: '₹0 Today',
    basePrice: 0,
    periodLabel: '30 Days Full Access',
    setupFee: 0,
    customizationNote: 'Standard software features',
    billingNotice:
      'Auto-debit begins after 1 month (30 days) at standard Base Plan rates. Cancel anytime.',
  },
};

const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none transition-all';
const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-outline mb-1';

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  selectedPlan: initialPlan,
  onClose,
}) => {
  const [plan, setPlan] = useState<PlanType>(initialPlan);
  const [gymName, setGymName] = useState('');
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');

  // Sync plan when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setPlan(initialPlan);
    }
  }, [isOpen, initialPlan]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], select, textarea, [tabindex="0"]') || []).filter(el => el.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [isOpen, onClose, busy]);

  if (!isOpen) return null;

  const currentPlan = PLAN_DETAILS[plan];
  const isPaidPlan = plan !== 'trial';
  const remainingTotalToPay = isPaidPlan ? currentPlan.basePrice : 0;

  const handleGymNameChange = (val: string) => {
    setGymName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 24).replace(/^-+|-+$/g, '');
    if (!slug || slug === autoSlug.slice(0, slug.length)) {
      setSlug(autoSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!gymName.trim() || !name.trim() || !email.trim()) {
      setError('Please fill in all gym and account details.');
      return;
    }

    setBusy(true);

    const formData = new FormData();
    formData.append('gymName', gymName.trim());
    formData.append(
      'slug',
      slug.trim().toLowerCase()
    );
    formData.append('name', name.trim());
    formData.append('email', email.trim().toLowerCase());
    formData.append('phone', phone.trim());
    formData.append('plan', plan);

    try {
      const res = prepareGymEnquiry(formData);
      setBusy(false);

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.whatsappUrl && res.requiresPayment) {
        setWhatsappUrl(res.whatsappUrl);
        window.location.href = res.whatsappUrl;
      } else {
        window.location.href = '/';
      }
    } catch {
      setBusy(false);
      setError('Something went wrong. Please check your details and try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
      ref={dialogRef}
      role="dialog"
      aria-labelledby="subscription-title"
      aria-modal="true"
      onClick={() => { if (!busy) onClose(); }}
    >
      <div
        className="w-full max-w-xl bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low/30">
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="NeuraFitness"
                className="h-6 w-auto object-contain shrink-0"
              />
              <h2 id="subscription-title" className="font-sora text-sm sm:text-base font-bold text-on-surface">
                {plan === 'trial' ? 'Start 1-Month Free Trial' : 'Activate Gym Subscription'}
              </h2>
            </div>
            <p className="text-[11px] text-outline mt-0.5">
              Activation after payment verification · Biometric setup & one-tap WhatsApp tools
            </p>
          </div>
          <button
            onClick={() => { if (!busy) onClose(); }}
            disabled={busy}
            aria-label="Close subscription form"
            className="text-outline hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-on-surface">
          {whatsappUrl && <a href={whatsappUrl} className="block text-secondary underline">Open WhatsApp again — tap Send to complete your enquiry</a>}
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs font-semibold text-error">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Plan Selector: Base vs Pro */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Select Your Plan *</label>
              <span className="text-[10px] text-outline">
                {currentPlan.tier === 'BASE' ? 'Standard software (no customization)' : 'Includes customization & personalizations'}
              </span>
            </div>

            {/* Base Plan Options */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                1. Base Plan (No customization / modification)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPlan('base_1m')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    plan === 'base_1m' || plan === 'monthly'
                      ? 'border-secondary bg-secondary/15 ring-2 ring-secondary/30 text-on-surface'
                      : 'border-surface-container-high bg-surface-container-low text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="font-bold block text-xs">1 Mo Demo</span>
                  <span className="text-[11px] text-secondary font-extrabold">₹999/-</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlan('base_6m')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    plan === 'base_6m' || plan === '6months'
                      ? 'border-secondary bg-secondary/15 ring-2 ring-secondary/30 text-on-surface'
                      : 'border-surface-container-high bg-surface-container-low text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="font-bold block text-xs">6 Months</span>
                  <span className="text-[11px] text-secondary font-extrabold">₹2,399/-</span>
                  <span className="text-[9px] text-emerald-400 block font-bold mt-0.5">+1 Mo Free Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlan('base_1y')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    plan === 'base_1y' || plan === '1year'
                      ? 'border-secondary bg-secondary/15 ring-2 ring-secondary/30 text-on-surface'
                      : 'border-surface-container-high bg-surface-container-low text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="font-bold block text-xs">1 Year</span>
                  <span className="text-[11px] text-secondary font-extrabold">₹3,499/-</span>
                  <span className="text-[9px] text-emerald-400 block font-bold mt-0.5">+1 Mo Free Demo</span>
                </button>
              </div>
            </div>

            {/* Pro Plan Options */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                2. Pro Plan (Customization & Personalization)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlan('pro_6m')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    plan === 'pro_6m'
                      ? 'border-primary bg-primary/15 ring-2 ring-primary/30 text-on-surface'
                      : 'border-surface-container-high bg-surface-container-low text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="font-bold block text-xs">6 Months Pro</span>
                  <span className="text-[11px] text-primary font-extrabold">₹3,499/-</span>
                  <span className="text-[9px] text-primary/90 block font-medium mt-0.5">1 customization free</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlan('pro_1y')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    plan === 'pro_1y'
                      ? 'border-primary bg-primary/15 ring-2 ring-primary/30 text-on-surface'
                      : 'border-surface-container-high bg-surface-container-low text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="font-bold block text-xs">1 Year Pro</span>
                  <span className="text-[11px] text-primary font-extrabold">₹5,499/-</span>
                  <span className="text-[9px] text-primary/90 block font-medium mt-0.5">2 customizations free</span>
                </button>
              </div>
            </div>
          </div>

          {plan === 'trial' && (
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-secondary/30 flex items-center justify-between text-xs">
              <span className="font-semibold text-secondary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">hourglass_top</span>
                Selected: 1-Month Free Trial (₹0 Today)
              </span>
              <button
                type="button"
                onClick={() => setPlan('base_6m')}
                className="text-xs text-outline hover:text-on-surface font-semibold underline cursor-pointer"
              >
                Switch to Base 6M (+1M Free)
              </button>
            </div>
          )}

          {/* Pricing & Billing Summary Card with Live Breakdown */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-sora text-sm font-bold text-on-surface block">{currentPlan.name}</span>
                <span className="text-[11px] text-outline">{currentPlan.periodLabel}</span>
                {currentPlan.bonusText && (
                  <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                    🎉 {currentPlan.bonusText}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="font-sora text-lg font-extrabold text-secondary block">
                  {isPaidPlan ? `₹${remainingTotalToPay.toLocaleString('en-IN')}/-` : '₹0 Today'}
                </span>
                <span className="text-[10px] text-outline block">
                  {isPaidPlan ? 'Total amount to pay' : '30 days full testing'}
                </span>
              </div>
            </div>

            {/* Features summary note */}
            <div className="pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[11px] text-outline">
              <span>Features Included:</span>
              <span className="text-on-surface font-semibold">{currentPlan.customizationNote}</span>
            </div>
          </div>

            {/* Advance Notice / Autopay Guarantee Notice */}
            <div className="p-2.5 rounded-lg bg-surface-container text-[11px] text-on-surface-variant flex items-start gap-2 border border-surface-container-high">
              <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">
                verified_user
              </span>
              <p className="leading-relaxed">{currentPlan.billingNotice}</p>
            </div>

          {/* Section: Gym & Owner Details */}
          <div className="space-y-3 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
              1. Gym & Account Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="subscription-gymName" className={labelClass}>Gym Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Iron Fitness Arena"
                  id="subscription-gymName"
                  value={gymName}
                  onChange={(e) => handleGymNameChange(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="subscription-slug" className={labelClass}>Gym URL Code / Slug *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ironfitness"
                  id="subscription-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="subscription-name" className={labelClass}>Owner Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Aditya Sharma"
                  id="subscription-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="subscription-phone" className={labelClass}>WhatsApp / Mobile *</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  id="subscription-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="subscription-email" className={labelClass}>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="owner@yourgym.com"
                  id="subscription-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

            </div>
          </div>

          {/* Section: Direct WhatsApp UPI Payment Notice */}
          {plan !== 'trial' ? (
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-base">chat</span>
                  Direct UPI Payment via WhatsApp
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
                  Zero Gateway Surcharge
                </span>
              </div>
              <p className="text-xs text-outline leading-relaxed">
                Continue to WhatsApp with your gym details prefilled, then tap Send to share them with our co-founder. Our team will verify payment and create your owner login. This form does not create an account or take payment.
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-secondary">
                <span className="material-symbols-outlined text-sm">security</span>
                <span>100% Safe · No credit card or auto-debit mandates needed</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-start gap-2 text-tertiary text-[11px]">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">verified</span>
              <p className="leading-relaxed">
                <strong>Instant Free Trial Activation:</strong> No credit card or payment required today. You get full access to all cloud features and WhatsApp automations for 30 days.
              </p>
            </div>
          )}

          {/* Submit Button showing Live Amount to Pay */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 px-5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {busy && (
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
              )}
              <span>
                {busy
                  ? 'Preparing WhatsApp...'
                  : plan === 'trial'
                  ? 'Start 1-Month Free Trial (₹0 Today)'
                  : `Send Gym Details · ₹${remainingTotalToPay.toLocaleString('en-IN')} Plan`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
