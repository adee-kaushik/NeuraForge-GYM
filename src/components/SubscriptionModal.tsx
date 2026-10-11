'use client';

import React, { useState } from 'react';
import { signupOwner } from '@/app/signup/actions';

export type PlanType = 'trial' | '6months' | '1year';

interface SubscriptionModalProps {
  isOpen: boolean;
  selectedPlan: PlanType;
  onClose: () => void;
}

const PLAN_DETAILS: Record<
  PlanType,
  {
    name: string;
    priceLabel: string;
    periodLabel: string;
    setupFee: number;
    totalToday: number;
    billingNotice: string;
  }
> = {
  trial: {
    name: '14-Day Full Free Trial',
    priceLabel: '₹0 Today',
    periodLabel: '14 Days Access',
    setupFee: 0,
    totalToday: 0,
    billingNotice:
      'Auto-debit begins after 14 days at ₹5,000/yr (+ ₹10,000 one-time setup fee). We will notify you via WhatsApp & SMS 36 hours before deducting. Cancel anytime in 1 click.',
  },
  '6months': {
    name: 'Semi-Annual Plan (6 Months)',
    priceLabel: '₹3,000',
    periodLabel: '6 Months License',
    setupFee: 10000,
    totalToday: 13000,
    billingNotice:
      'Total due today: ₹13,000 (₹3,000 for 6 Months license + ₹10,000 one-time onboarding & biometric cloud setup fee).',
  },
  '1year': {
    name: 'Annual Plan (1 Year) — Best Value',
    priceLabel: '₹5,000',
    periodLabel: '1 Year License',
    setupFee: 10000,
    totalToday: 15000,
    billingNotice:
      'Total due today: ₹15,000 (₹5,000 for 1 Year license + ₹10,000 one-time onboarding & biometric cloud setup fee). Save ₹1,000.',
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
  const [password, setPassword] = useState('');

  // Payment / Mandate Details
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentPlan = PLAN_DETAILS[plan];

  const handleGymNameChange = (val: string) => {
    setGymName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 24);
    if (!slug || slug === autoSlug.slice(0, slug.length)) {
      setSlug(autoSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!gymName.trim() || !name.trim() || !email.trim() || !password) {
      setError('Please fill in all gym and account details.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Validate mandate / payment details
    if (paymentMethod === 'upi' && (!upiId.trim() || !upiId.includes('@'))) {
      setError('Enter a valid UPI ID (e.g. gymowner@okhdfcbank or @upi) for the mandate.');
      return;
    }

    if (paymentMethod === 'card') {
      const cleanCard = cardNumber.replace(/\D/g, '');
      if (cleanCard.length < 15) {
        setError('Enter a valid 16-digit debit or credit card number.');
        return;
      }
      if (!cardExpiry.trim() || !cardCvv.trim()) {
        setError('Enter your card expiry and CVV.');
        return;
      }
    }

    setBusy(true);

    const formData = new FormData();
    formData.append('gymName', gymName.trim());
    formData.append('slug', (slug || gymName).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'gym');
    formData.append('name', name.trim());
    formData.append('email', email.trim().toLowerCase());
    formData.append('password', password);
    formData.append('plan', plan);
    formData.append(
      'mandateId',
      `MANDATE-${paymentMethod.toUpperCase()}-${Date.now().toString(36)}`
    );
    formData.append('paymentMethod', paymentMethod);

    try {
      const res = await signupOwner({}, formData);
      setBusy(false);

      if (res.error) {
        setError(res.error);
        return;
      }

      // Success: instantly navigate to dashboard
      window.location.href = '/';
    } catch {
      setBusy(false);
      setError('Something went wrong. Please check your details and try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary text-on-primary font-sora font-extrabold flex items-center justify-center text-xs">
                NF
              </span>
              <h2 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                {plan === 'trial' ? 'Start 14-Day Free Trial' : 'Activate Gym Subscription'}
              </h2>
            </div>
            <p className="text-[11px] text-outline mt-0.5">
              Instant activation with biometric setup & full WhatsApp automation
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-outline hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-on-surface">
          {error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs font-semibold text-error">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Plan Selector Bar */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-container border border-surface-container-high text-center font-bold text-[11px]">
            <button
              type="button"
              onClick={() => setPlan('trial')}
              className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
                plan === 'trial'
                  ? 'bg-surface-container-lowest text-secondary shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              14-Day Trial (₹0)
            </button>
            <button
              type="button"
              onClick={() => setPlan('6months')}
              className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
                plan === '6months'
                  ? 'bg-surface-container-lowest text-secondary shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              6 Months (₹3k)
            </button>
            <button
              type="button"
              onClick={() => setPlan('1year')}
              className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
                plan === '1year'
                  ? 'bg-surface-container-lowest text-secondary shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              1 Year (₹5k) ★
            </button>
          </div>

          {/* Pricing & Billing Summary Card */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-sora text-sm font-bold text-on-surface block">{currentPlan.name}</span>
                <span className="text-[11px] text-outline">{currentPlan.periodLabel}</span>
              </div>
              <div className="text-right">
                <span className="font-sora text-lg font-extrabold text-secondary block">
                  {currentPlan.priceLabel}
                </span>
                {currentPlan.setupFee > 0 && (
                  <span className="text-[10px] text-outline block">+ ₹10,000 setup fee</span>
                )}
              </div>
            </div>

            {/* Advance Notice / Autopay Guarantee Notice */}
            <div className="p-2.5 rounded-lg bg-surface-container text-[11px] text-on-surface-variant flex items-start gap-2 border border-surface-container-high">
              <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">
                verified_user
              </span>
              <p className="leading-relaxed">{currentPlan.billingNotice}</p>
            </div>
          </div>

          {/* Section: Gym & Owner Details */}
          <div className="space-y-3 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
              1. Gym & Account Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Gym Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Iron Fitness Arena"
                  value={gymName}
                  onChange={(e) => handleGymNameChange(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Gym URL Code / Slug *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ironfitness"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Owner Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Aditya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>WhatsApp / Mobile *</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="owner@yourgym.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Create Password (min 8 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Section: Autopay / Payment Mandate Setup */}
          <div className="space-y-3 pt-2 border-t border-surface-container-high">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                {plan === 'trial' ? '2. Autopay Mandate (₹0 Charged Today)' : '2. Payment / Mandate Details'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
                RBI & NPCI Compliant
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-secondary bg-secondary/10 text-on-surface'
                    : 'border-surface-container-high bg-surface-container-low text-outline'
                }`}
              >
                <span className="material-symbols-outlined text-lg text-secondary">account_balance_wallet</span>
                <div>
                  <span className="font-bold text-xs block text-on-surface">UPI Autopay</span>
                  <span className="text-[10px] text-outline">GPay, PhonePe, Paytm</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'card'
                    ? 'border-secondary bg-secondary/10 text-on-surface'
                    : 'border-surface-container-high bg-surface-container-low text-outline'
                }`}
              >
                <span className="material-symbols-outlined text-lg text-secondary">credit_card</span>
                <div>
                  <span className="font-bold text-xs block text-on-surface">Credit / Debit Card</span>
                  <span className="text-[10px] text-outline">Visa, Mastercard, RuPay</span>
                </div>
              </button>
            </div>

            {/* UPI Input */}
            {paymentMethod === 'upi' && (
              <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2">
                <label className={labelClass}>Your UPI ID / VPA *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. gymowner@okhdfcbank or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className={inputClass}
                />
                <p className="text-[10px] text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-tertiary">check_circle</span>
                  A mandate authorization notification will be sent to your UPI app.
                </p>
              </div>
            )}

            {/* Card Inputs */}
            {paymentMethod === 'card' && (
              <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container-high space-y-2.5">
                <div>
                  <label className={labelClass}>Card Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="4111 2222 3333 4444"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Expiry (MM/YY) *</label>
                    <input
                      type="text"
                      required
                      placeholder="12/28"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CVV *</label>
                    <input
                      type="password"
                      required
                      placeholder="•••"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advance Reminder Notice Guarantee */}
          <div className="p-3 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-start gap-2 text-tertiary text-[11px]">
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5">notifications_active</span>
            <p className="leading-relaxed">
              <strong>36-Hour Advance Reminder Guarantee:</strong> We will notify you via SMS & WhatsApp 36 hours prior to any deduction. You can cancel your subscription anytime with 1 click before the date.
            </p>
          </div>

          {/* Submit Button */}
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
                  ? 'Activating Subscription & Setting Up...'
                  : plan === 'trial'
                  ? 'Authorize Mandate & Start 14-Day Free Trial (₹0 Today)'
                  : `Pay ₹${currentPlan.totalToday.toLocaleString('en-IN')} & Activate Gym OS`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
