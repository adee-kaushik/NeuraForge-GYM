'use client';

import Link from 'next/link';
import { useEffect, useState, useActionState } from 'react';
import { signupOwner, checkIsFirstCustomer, type SignupState } from './actions';
import { checkCoupon } from '@/app/actions/coupon';
import { type CouponDefinition, BASE_SETUP_FEE } from '@/lib/coupons';

const initialState: SignupState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

export type SignupPlanType =
  | 'base_1m'
  | 'base_6m'
  | 'base_1y'
  | 'pro_6m'
  | 'pro_1y'
  | 'monthly'
  | '6months'
  | '1year'
  | 'trial';

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupOwner, initialState);
  const [plan, setPlan] = useState<SignupPlanType>('base_1y');
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstCustomer, setIsFirstCustomer] = useState(true);

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDefinition | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    checkIsFirstCustomer().then(setIsFirstCustomer);
    // Check if plan or coupon query is in URL
    const searchParams = new URLSearchParams(window.location.search);
    const p = searchParams.get('plan') as SignupPlanType | null;
    if (p) {
      setPlan(p);
    }
    const c = searchParams.get('coupon');
    if (c) {
      setCouponCodeInput(c.toUpperCase());
      handleApplyCoupon(c.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (state.success) {
      if (state.whatsappUrl && state.requiresPayment) {
        window.location.href = state.whatsappUrl;
      } else {
        window.location.href = '/';
      }
    }
  }, [state.success, state.whatsappUrl, state.requiresPayment]);

  const handleApplyCoupon = async (codeToTry?: string) => {
    const code = (codeToTry || couponCodeInput).trim().toUpperCase();
    if (!code) {
      setCouponError('Enter a coupon code.');
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
        setCouponError(res.error || 'Invalid or expired coupon.');
      }
    } catch {
      setCouponError('Could not verify coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
  };

  const isBusy = pending || Boolean(state.success);

  // Pricing calculations
  let basePlanPrice = 0;
  let planTitle = '1-Month Free Trial';
  let bonusTag = '';
  let customTag = 'No customization / modification';

  if (plan === 'base_1m' || plan === 'monthly') {
    basePlanPrice = 999;
    planTitle = 'Base Plan: 1 Month Demo';
    customTag = 'No customization / modification';
  } else if (plan === 'base_6m' || plan === '6months') {
    basePlanPrice = 2399;
    planTitle = 'Base Plan: 6 Months (+1 Mo Free Demo)';
    bonusTag = '+1 Month Free Demo';
    customTag = 'No customization / modification';
  } else if (plan === 'base_1y' || plan === '1year') {
    basePlanPrice = 3499;
    planTitle = 'Base Plan: 1 Year (+1 Mo Free Demo)';
    bonusTag = '+1 Month Free Demo';
    customTag = 'No customization / modification';
  } else if (plan === 'pro_6m') {
    basePlanPrice = 3499;
    planTitle = 'Pro Plan: 6 Months';
    customTag = '1 Customization Free & Full Personalization';
  } else if (plan === 'pro_1y') {
    basePlanPrice = 5499;
    planTitle = 'Pro Plan: 1 Year';
    customTag = '2 Customizations Free & Full Personalization';
  }

  const isPaidPlan = plan !== 'trial';
  const remainingTotalToPay = isPaidPlan ? basePlanPrice : 0;

  return (
    <main className="min-h-screen bg-background text-on-surface flex flex-col justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg mx-auto space-y-4">
        {/* Navigation Bar / Return to Home */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-bold text-outline hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Home
          </Link>
          <img src="/logo.png" alt="NeuraFitness" className="h-6 w-auto object-contain" />
        </div>

        <form
          action={formAction}
          className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
        >
          <div>
            <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">
              Activate Gym Subscription
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Select Base Plan (Standard) or Pro Plan (Customization &amp; Personalization).
            </p>
          </div>

          {/* Pilot / First Customer Special Access OR Plan Selection */}
          {isFirstCustomer ? (
            <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/30 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                <span className="material-symbols-outlined text-xl">verified</span>
                <span>Inaugural Partner Access — 100% Free SaaS Testing</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Welcome to NeuraFitness! As our very first real gym partner, your entire platform access is completely sponsored for SaaS testing. <strong>No payment details, card number, or UPI mandate are required.</strong>
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-secondary">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>All biometric attendance, member CRM, and digital pass features fully unlocked</span>
              </div>
              <input type="hidden" name="plan" value="pilot" />
              <input type="hidden" name="mandateId" value="WAIVED_FIRST_CUSTOMER" />
            </div>
          ) : (
            <>
              {/* Plan Selector */}
              <div className="space-y-3">
                <label className={labelClass}>Select Your Subscription Plan *</label>

                {/* Base Plan Group */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">
                    1. Base Plan (No Customization / Modification)
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
                      <span className="font-bold block text-xs">1M Demo</span>
                      <span className="text-[11px] text-secondary font-extrabold block">₹999/-</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlan('base_6m')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        plan === 'base_6m' || plan === '6months'
                          ? 'border-secondary bg-secondary/15 ring-2 ring-secondary/30 text-on-surface'
                          : 'border-surface-container-high bg-surface-container-low text-outline hover:text-on-surface'
                      }`}
                    >
                      <span className="font-bold block text-xs">6 Months</span>
                      <span className="text-[11px] text-secondary font-extrabold block">₹2,399/-</span>
                      <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">+1M Demo Free</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlan('base_1y')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        plan === 'base_1y' || plan === '1year'
                          ? 'border-secondary bg-secondary/15 ring-2 ring-secondary/30 text-on-surface'
                          : 'border-surface-container-high bg-surface-container-low text-outline hover:text-on-surface'
                      }`}
                    >
                      <span className="font-bold block text-xs">1 Year</span>
                      <span className="text-[11px] text-secondary font-extrabold block">₹3,499/-</span>
                      <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">+1M Demo Free</span>
                    </button>
                  </div>
                </div>

                {/* Pro Plan Group */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-1">
                    2. Pro Plan (Customization &amp; Personalization)
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
                      <span className="text-[11px] text-primary font-extrabold block">₹3,499/-</span>
                      <span className="text-[9px] text-primary/80 block mt-0.5">1 customization free</span>
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
                      <span className="text-[11px] text-primary font-extrabold block">₹5,499/-</span>
                      <span className="text-[9px] text-primary/80 block mt-0.5">2 customizations free</span>
                    </button>
                  </div>
                </div>

                {/* Free Trial Option */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setPlan('trial')}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      plan === 'trial'
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                        : 'border-surface-container-high bg-surface-container-low text-outline hover:text-on-surface'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">timer</span>
                      <span>Or Start 30-Day Free Trial (₹0 Today)</span>
                    </span>
                    <span>Free</span>
                  </button>
                </div>

                <input type="hidden" name="plan" value={plan} />
              </div>

              {/* Pricing Summary Card */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <div>
                    <span className="text-on-surface block font-sora">{planTitle}</span>
                    {bonusTag && (
                      <span className="text-[10px] text-emerald-400 font-semibold block">
                        🎉 {bonusTag}
                      </span>
                    )}
                  </div>
                  <span className="text-secondary font-sora text-sm">
                    {isPaidPlan ? `₹${remainingTotalToPay.toLocaleString('en-IN')}/-` : '₹0 Today'}
                  </span>
                </div>

                <div className="pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[11px] text-outline">
                  <span>Customization:</span>
                  <span className="text-on-surface font-semibold">{customTag}</span>
                </div>
              </div>

              <p className="text-[11px] text-outline">
                {plan === 'trial'
                  ? 'Start with full cloud access. Upgrade to Base or Pro plan anytime.'
                  : 'Includes turnstile biometric integration, WhatsApp automation, and cloud member pass sync.'}
              </p>

              {/* Coupon Code Section */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-secondary">confirmation_number</span>
                    Coupons (Valid till Dec 31, 2026)
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

                    {/* Quick-Apply Chips */}
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
            </>
          )}

          {/* Gym & Account Details */}
          <div>
            <label className={labelClass} htmlFor="gymName">
              Gym Name *
            </label>
            <input
              id="gymName"
              name="gymName"
              required
              className={inputClass}
              placeholder="e.g. Iron Pulse Fitness"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="slug">
              Gym Code / URL Slug *
            </label>
            <input
              id="slug"
              name="slug"
              required
              className={inputClass}
              placeholder="e.g. ironpulse"
              autoCapitalize="none"
            />
            <p className="text-xs text-outline mt-1">
              Your members use this code to log into their digital passes.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="name">
              Owner Full Name *
            </label>
            <input id="name" name="name" required className={inputClass} placeholder="Full Name" />
          </div>

          <div>
            <label className={labelClass} htmlFor="email">
              Email Address *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className={inputClass}
              placeholder="owner@yourgym.com"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="password">
              Password (min 8 characters) *
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                className={`${inputClass} pr-12`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface focus:outline-none p-1 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-xl select-none leading-none">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="phone">
              WhatsApp / Mobile Number *
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              className={inputClass}
              placeholder="e.g. 9876543210"
            />
            <p className="text-xs text-outline mt-1">
              Used for WhatsApp UPI payment instructions and onboarding support.
            </p>
          </div>

          {/* WhatsApp Direct UPI Notice for Paid Plans */}
          {!isFirstCustomer && plan !== 'trial' && (
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
                We accept subscription activations directly via UPI on WhatsApp. Once you submit your gym registration, you will be redirected to WhatsApp to send payment directly to our co-founders. Your Gym OS portal is activated immediately.
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-secondary">
                <span className="material-symbols-outlined text-sm">security</span>
                <span>100% Safe · No credit card or auto-debit mandates needed</span>
              </div>
            </div>
          )}

          {state.error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs font-semibold text-error">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{state.error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full px-5 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer mt-2"
          >
            {isBusy && (
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            )}
            {state.success
              ? 'Redirecting...'
              : pending
              ? 'Submitting Registration...'
              : isFirstCustomer || plan === 'trial'
              ? 'Register Gym & Start Free Access'
              : `Proceed to Pay ₹${remainingTotalToPay.toLocaleString('en-IN')} via WhatsApp UPI`}
          </button>

          <p className="text-xs text-outline text-center pt-2 border-t border-surface-container-high">
            Already an active gym subscriber?{' '}
            <Link href="/login" className="text-secondary font-bold hover:underline">
              Log in here
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}