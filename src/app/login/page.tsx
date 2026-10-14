'use client';

import Link from 'next/link';
import { useEffect, useState, useActionState } from 'react';
import { loginOwner, type LoginState } from './actions';

const initialState: LoginState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginOwner, initialState);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.success) {
      window.location.href = '/';
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
          <span className="text-xs font-bold text-secondary">NeuraFitness</span>
        </div>

        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold">
          <div className="py-2 text-center rounded-lg bg-surface-container-lowest text-secondary shadow-xs">
            👑 Owner
          </div>
          <Link
            href="/staff/login"
            className="py-2 text-center rounded-lg text-outline hover:text-on-surface transition-colors"
          >
            🛡️ Staff
          </Link>
          <Link
            href="/member/login"
            className="py-2 text-center rounded-lg text-outline hover:text-on-surface transition-colors"
          >
            📱 Member
          </Link>
        </div>

        {/* Main Login Card */}
        <form
          action={formAction}
          className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
        >
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30 text-[11px] font-bold mb-2">
              <span className="material-symbols-outlined text-sm">shield_person</span>
              <span>Gym Owner Portal</span>
            </div>
            <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">Gym Owner Login</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Sign in with your registered gym owner email to access full management, financials, and settings.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="owner@yourgym.com"
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-outline" htmlFor="password">
                Password
              </label>
              <Link
                href="/login/forgot-password"
                className="text-xs text-secondary font-semibold hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={`${inputClass} pr-12`}
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
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-outline">Forgotten your password?</span>
              <Link
                href="/login/forgot-password"
                className="text-secondary font-bold hover:underline inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">lock_reset</span>
                <span>Reset Password</span>
              </Link>
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
            className="w-full px-5 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            {isBusy && (
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            )}
            {state.success ? 'Opening Dashboard...' : pending ? 'Signing in...' : 'Sign in to Dashboard'}
          </button>

          <div className="pt-2 border-t border-surface-container-high text-center space-y-2">
            <p className="text-xs text-outline">
              New gym owner?{' '}
              <Link href="/signup" className="text-secondary font-bold hover:underline">
                Create gym account
              </Link>
            </p>
            <p className="text-xs text-outline">
              Looking for member pass?{' '}
              <Link href="/member/login" className="text-tertiary font-bold hover:underline">
                Go to member login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}