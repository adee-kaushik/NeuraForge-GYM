'use client';

import Link from 'next/link';
import { useEffect, useActionState } from 'react';
import { loginMember, type MemberLoginState } from '../actions';

const initialState: MemberLoginState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-tertiary focus:bg-surface-container-lowest rounded-xl px-4 py-3.5 text-base text-on-surface focus:outline-none transition-all';

export default function MemberLoginPage() {
  const [state, formAction, pending] = useActionState(loginMember, initialState);

  useEffect(() => {
    if (state.success) {
      window.location.href = '/member';
    }
  }, [state.success]);

  const isBusy = pending || Boolean(state.success);

  return (
    <main className="min-h-screen bg-background text-on-surface flex flex-col justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Navigation Bar / Return to Home */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-bold text-outline hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Home
          </Link>
          <span className="text-xs font-bold text-tertiary">Member Pass</span>
        </div>

        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold">
          <Link
            href="/login"
            className="py-2 text-center rounded-lg text-outline hover:text-on-surface transition-colors"
          >
            👑 Owner
          </Link>
          <Link href="/staff/login" className="py-2 text-center rounded-lg text-outline hover:text-on-surface">🛡️ Staff</Link>
          <div className="py-2 text-center rounded-lg bg-surface-container-lowest text-tertiary shadow-xs font-extrabold">
            📱 Member
          </div>
        </div>

        {/* Member Login Card (Passwordless: Gym Code + ID/Phone only) */}
        <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20">
                🔒 Gym Isolated Access
              </span>
              <span className="text-[11px] font-bold text-tertiary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">bolt</span>
                <span>Password protected</span>
              </span>
            </div>

            <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">
              Member Digital Pass
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed">
              Access your digital gym pass, QR code, active plan, and attendance using your Gym Code, Member ID and password from reception.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass} htmlFor="gymCode">
                  Unique Gym Code
                </label>
                <span className="text-[11px] text-outline">Unique to your gym</span>
              </div>
              <input
                id="gymCode"
                name="gymCode"
                required
                placeholder="e.g. iron-fitness (ask your front desk)"
                autoCapitalize="none"
                autoCorrect="off"
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass} htmlFor="memberCode">
                  Member ID
                </label>
                <span className="text-[11px] text-secondary font-semibold">Provided by reception</span>
              </div>
              <input
                id="memberCode"
                name="memberCode"
                required
                placeholder="e.g. MEM-001"
                autoCapitalize="none"
                autoCorrect="off"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" maxLength={256} className={inputClass} />
            </div>

            {state.error && (
              <div role="alert" className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs font-semibold text-error">
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
              {state.success ? 'Opening Digital Pass...' : pending ? 'Authenticating...' : 'Open My Digital Pass'}
            </button>
          </form>

          {/* Quick tips & Footer */}
          <div className="pt-3 border-t border-surface-container-high text-center space-y-2">
            <p className="text-[11px] text-outline">
              Forgot your password? Ask gym reception to reset it securely.
            </p>
            <p className="text-xs text-outline">
              Gym owner or receptionist?{' '}
              <Link href="/login" className="text-secondary font-bold hover:underline">
                Log in to Owner Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
