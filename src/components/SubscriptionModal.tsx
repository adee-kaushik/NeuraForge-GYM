'use client';

import React, { useState, useEffect } from 'react';
import { signupOwner } from '@/app/signup/actions';
import { checkCoupon } from '@/app/actions/coupon';
import { type CouponDefinition, BASE_SETUP_FEE } from '@/lib/coupons';

export type PlanType = 'trial' | '6months' | '1year';

interface SubscriptionModalProps {
  isOpen: boolean;
  selectedPlan: PlanType;
  initialCouponCode?: string;
  onClose: () => void;
}

const PLAN_DETAILS: Record<
  PlanType,
  {
    name: string;
    priceLabel: string;
    basePrice: number;
    periodLabel: string;
    setupFee: number;
    billingNotice: string;
  }
> = {
  trial: {
    name: '1-Month Full Free Trial',
    priceLabel: '₹0 Today',
    basePrice: 0,
    periodLabel: '30 Days Full Access',
    setupFee: 0,
    billingNotice:
      'Auto-debit begins after 1 month (30 days) at ₹5,000/yr (+ one-time setup fee). We will notify you via WhatsApp & SMS 36 hours before deducting. Cancel anytime in 1 click.',
  },
  '6months': {
    name: 'Semi-Annual Plan (6 Months)',
    priceLabel: '₹3,000',
    basePrice: 3000,
    periodLabel: '6 Months License',
    setupFee: BASE_SETUP_FEE,
    billingNotice:
      '6 Months full cloud license + one-time onboarding, turnstile and biometric cloud setup fee.',
  },
  '1year': {
    name: 'Annual Plan (1 Year) — Best Value',
    priceLabel: '₹5,000',
    basePrice: 5000,
    periodLabel: '1 Year License',
    setupFee: BASE_SETUP_FEE,
    billingNotice:
      '1 Full Year cloud license + one-time onboarding, turnstile and biometric cloud setup fee. Save ₹1,000.',
  },
};

const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none transition-all';
const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-outline mb-1';

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  selectedPlan: initialPlan,
  initialCouponCode = '',
  onClose,
}) => {
  const [plan, setPlan] = useState<PlanType>(initialPlan);
  const [gymName, setGymName] = useState('');
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState(initialCouponCode);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDefinition | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Payment / Mandate Details
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Sync plan and initial coupon when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setPlan(initialPlan);
      if (initialCouponCode && !appliedCoupon) {
        setCouponCodeInput(initialCouponCode);
        handleApplyCoupon(initialCouponCode);
      }
    }
  }, [isOpen, initialPlan, initialCouponCode]);

  if (!isOpen) return null;

  const currentPlan = PLAN_DETAILS[plan];

  // Coupon discount calculations
  const setupDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const isPaidPlan = plan !== 'trial';
  const effectiveSetupFee = isPaidPlan ? Math.max(0, currentPlan.setupFee - setupDiscount) : 0;
  const remainingTotalToPay = isPaidPlan ? currentPlan.basePrice + effectiveSetupFee : 0;

  const handleApplyCoupon = async (codeToTry?: string) => {
    const code = (codeToTry || couponCodeInput).trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await checkCoupon(code);
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponCodeInput(res.coupon.code);
        setCouponError('');
      } else {
        setAppliedCoupon(null);
        setCouponError(res.error || 'Invalid or expired coupon code.');
      }
    } catch {
      setCouponError('Could not verify coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
  };

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
    formData.append(
      'slug',
      (slug || gymName).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'gym'
    );
    formData.append('name', name.trim());
    formData.append('email', email.trim().toLowerCase());
    formData.append('password', password);
    formData.append('plan', plan);
    formData.append(
      'mandateId',
      `MANDATE-${paymentMethod.toUpperCase()}-${Date.now().toString(36)}`
    );
    formData.append('paymentMethod', paymentMethod);
    if (appliedCoupon) {
      formData.append('couponCode', appliedCoupon.code);
    }

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
                {plan === 'trial' ? 'Start 1-Month Free Trial' : 'Activate Gym Subscription'}
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
              1-Month Trial (₹0)
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

          {/* Pricing & Billing Summary Card with Live Breakdown */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-sora text-sm font-bold text-on-surface block">{currentPlan.name}</span>
                <span className="text-[11px] text-outline">{currentPlan.periodLabel}</span>
              </div>
              <div className="text-right">
                <span className="font-sora text-lg font-extrabold text-secondary block">
                  {isPaidPlan ? `₹${remainingTotalToPay.toLocaleString('en-IN')}` : '₹0 Today'}
                </span>
                <span className="text-[10px] text-outline block">
                  {isPaidPlan ? 'Remaining amount to pay' : 'Setup fee deferred for 30 days'}
                </span>
              </div>
            </div>

            {/* Itemized Price Breakdown */}
            {isPaidPlan && (
              <div className="pt-2 border-t border-surface-container-high/60 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-outline">
                  <span>Plan License ({currentPlan.name}):</span>
                  <span className="text-on-surface font-semibold">₹{currentPlan.basePrice.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between text-outline">
                  <span>One-Time Hardware & Onboarding Setup:</span>
                  <span className={appliedCoupon ? 'line-through text-outline' : 'text-on-surface font-semibold'}>
                    ₹{BASE_SETUP_FEE.toLocaleString('en-IN')}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-tertiary font-bold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">local_activity</span>
                      Coupon Discount ({appliedCoupon.code} - {appliedCoupon.discountPercent}% Off Setup):
                    </span>
                    <span>-₹{appliedCoupon.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-surface-container-high font-bold text-xs text-on-surface">
                  <span>Remaining Amount to Pay Today:</span>
                  <span className="text-secondary font-sora text-sm">₹{remainingTotalToPay.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {plan === 'trial' && appliedCoupon && (
              <div className="p-2 rounded-lg bg-tertiary/10 border border-tertiary/20 text-[11px] text-tertiary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
                <span>
                  <strong>{appliedCoupon.code} Locked:</strong> You will get {appliedCoupon.discountPercent}% (₹{appliedCoupon.discountAmount}) off your setup fee when your 1-month trial converts.
                </span>
              </div>
            )}

            {/* Advance Notice / Autopay Guarantee Notice */}
            <div className="p-2.5 rounded-lg bg-surface-container text-[11px] text-on-surface-variant flex items-start gap-2 border border-surface-container-high">
              <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">
                verified_user
              </span>
              <p className="leading-relaxed">{currentPlan.billingNotice}</p>
            </div>
          </div>

          {/* Section: Promotional Coupon Section */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-secondary">confirmation_number</span>
                Have a Setup Fee Coupon? (Valid till Dec 31)
              </label>
              <span className="text-[10px] text-outline font-semibold">Max 5 uses per coupon</span>
            </div>

            {appliedCoupon ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-tertiary/10 border border-tertiary/30">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-base">verified</span>
                  <div>
                    <span className="font-bold text-xs text-on-surface block">
                      {appliedCoupon.code} Applied ({appliedCoupon.badge})
                    </span>
                    <span className="text-[10px] text-tertiary font-semibold">
                      ₹{appliedCoupon.discountAmount.toLocaleString('en-IN')} saved on one-time setup fee
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs text-error font-bold hover:underline px-2 py-1 rounded cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter SETUP50, SETUP30, or SETUP10"
                    className="flex-1 bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-xl px-3 py-2 text-xs text-on-surface uppercase tracking-wider font-semibold focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponLoading || !couponCodeInput.trim()}
                    className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {couponLoading ? 'Checking...' : 'Apply Coupon'}
                  </button>
                </div>

                {couponError && (
                  <p className="text-[11px] font-semibold text-error flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    {couponError}
                  </p>
                )}

                {/* Quick-Apply Coupon Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-outline font-medium mr-1">Quick Apply:</span>
                  {[
                    { code: 'SETUP50', label: 'SETUP50 (50% Off)' },
                    { code: 'SETUP30', label: 'SETUP30 (30% Off)' },
                    { code: 'SETUP10', label: 'SETUP10 (10% Off)' },
                  ].map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCouponCodeInput(c.code);
                        handleApplyCoupon(c.code);
                      }}
                      className="px-2 py-0.5 rounded-lg border border-surface-container-highest bg-surface-container text-[10px] font-bold text-on-surface-variant hover:border-secondary hover:text-secondary transition-all cursor-pointer"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface focus:outline-none p-1 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-base select-none leading-none">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
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
                  ? 'Activating Subscription & Setting Up...'
                  : plan === 'trial'
                  ? 'Authorize Mandate & Start 1-Month Free Trial (₹0 Today)'
                  : `Pay ₹${remainingTotalToPay.toLocaleString('en-IN')} & Activate Gym OS`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
