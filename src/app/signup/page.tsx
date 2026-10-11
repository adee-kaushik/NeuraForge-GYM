'use client';

import Link from 'next/link';
import { useEffect, useState, useActionState } from 'react';
import { signupOwner, type SignupState } from './actions';

const initialState: SignupState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupOwner, initialState);
  const [plan, setPlan] = useState<'trial' | '6months' | '1year'>('trial');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  useEffect(() => {
    // Check if plan query is in URL
    const searchParams = new URLSearchParams(window.location.search);
    const p = searchParams.get('plan');
    if (p === '6months' || p === '1year' || p === 'trial') {
      setPlan(p);
    }
  }, []);

  useEffect(() => {
    if (state.success) {
      window.location.href = '/';
    }
  }, [state.success]);

  const isBusy = pending || Boolean(state.success);

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
          <span className="text-xs font-bold text-secondary">NeuraForge Gym OS</span>
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
              Select your subscription plan or activate a 14-day free trial.
            </p>
          </div>

          {/* Plan Selector */}
          <div>
            <label className={labelClass}>Select Your Subscription Plan *</label>
            <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-container border border-surface-container-high text-center font-bold text-xs">
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
            <input type="hidden" name="plan" value={plan} />
            <input
              type="hidden"
              name="mandateId"
              value={`MANDATE-${paymentMethod.toUpperCase()}-${Date.now().toString(36)}`}
            />
          </div>

          {/* Pricing Notice */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-on-surface">
                {plan === 'trial'
                  ? '14-Day Full Free Trial'
                  : plan === '6months'
                  ? 'Semi-Annual Plan (6 Months)'
                  : 'Annual Plan (1 Year)'}
              </span>
              <span className="text-secondary font-sora text-sm">
                {plan === 'trial' ? '₹0 Today' : plan === '6months' ? '₹13,000 Total' : '₹15,000 Total'}
              </span>
            </div>
            <p className="text-[11px] text-outline">
              {plan === 'trial'
                ? 'Card / UPI Autopay details required. Renews at ₹5,000/yr (+ setup fee) after 14 days. Cancel anytime with 1 click.'
                : 'Includes ₹10,000 one-time onboarding, cloud ADMS biometric setup, and historical data migration.'}
            </p>
          </div>

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
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {/* Autopay Mandate Section */}
          <div className="pt-2 border-t border-surface-container-high space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelClass}>
                {plan === 'trial' ? 'Card or UPI Autopay Mandate (₹0 Today)' : 'Payment / Mandate Method'}
              </label>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
                RBI Compliant
              </span>
            </div>

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
                  <span className="font-bold text-xs block text-on-surface">Card Mandate</span>
                  <span className="text-[10px] text-outline">Visa, Mastercard</span>
                </div>
              </button>
            </div>

            {paymentMethod === 'upi' ? (
              <div>
                <label className={labelClass}>UPI ID / VPA *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. gymowner@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className={inputClass}
                />
              </div>
            ) : (
              <div className="space-y-2">
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

            {/* 36-Hour Reminder Guarantee */}
            <div className="p-3 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-start gap-2 text-tertiary text-[11px]">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">notifications_active</span>
              <p className="leading-relaxed">
                <strong>36-Hour Advance Notice Guarantee:</strong> We remind you via SMS & WhatsApp 36 hours before your free trial concludes. Cancel anytime with 1 click.
              </p>
            </div>
          </div>

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
              ? 'Opening Gym Dashboard...'
              : pending
              ? 'Activating Subscription...'
              : plan === 'trial'
              ? 'Authorize Mandate & Start 14-Day Free Trial (₹0 Today)'
              : 'Pay & Activate Gym OS Account'}
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