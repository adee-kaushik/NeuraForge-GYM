'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginMember, type MemberLoginState } from '../actions';

const initialState: MemberLoginState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-tertiary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

export default function MemberLoginPage() {
  const [state, formAction, pending] = useActionState(loginMember, initialState);

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
        <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold">
          <Link
            href="/login"
            className="py-2 text-center rounded-lg text-outline hover:text-on-surface transition-colors"
          >
            🏢 Staff & Owner
          </Link>
          <div className="py-2 text-center rounded-lg bg-surface-container-lowest text-on-surface shadow-xs">
            📱 Gym Member
          </div>
        </div>

        {/* Main Member Login Card */}
        <form
          action={formAction}
          className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
        >
          <div>
            <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">Member Digital Pass</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Sign in to view your dynamic QR pass, active plan, and attendance.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="gymCode">
              Gym Code / Slug
            </label>
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
            <label className={labelClass} htmlFor="memberCode">
              Member ID
            </label>
            <input
              id="memberCode"
              name="memberCode"
              required
              placeholder="MEM-001"
              autoCapitalize="characters"
              autoCorrect="off"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoCapitalize="none"
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          {state.error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs font-semibold text-error">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{state.error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full px-5 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            {pending && (
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            )}
            {pending ? 'Opening Digital Pass...' : 'Open My Digital Pass'}
          </button>

          <div className="pt-2 border-t border-surface-container-high text-center space-y-2">
            <p className="text-xs text-outline">
              Forgot your credentials? Ask your gym front desk to resend them to your WhatsApp.
            </p>
            <p className="text-xs text-outline">
              Gym owner or receptionist?{' '}
              <Link href="/login" className="text-secondary font-bold hover:underline">
                Log in to Staff Portal
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
