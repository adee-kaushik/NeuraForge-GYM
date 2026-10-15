'use client';

import Link from 'next/link';
import { useEffect, useState, useActionState } from 'react';
import { loginOwner, type LoginState } from '@/app/login/actions';

const initialState: LoginState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

export default function StaffLoginPage() {
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

        {/* Portal Switcher Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold">
          <Link
            href="/login"
            className="py-2 text-center rounded-lg text-outline hover:text-on-surface transition-colors"
          >
            👑 Owner
          </Link>
          <div className="py-2 text-center rounded-lg bg-surface-container-lowest text-primary shadow-xs">
            🛡️ Staff
          </div>
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-[11px] font-bold mb-2">
              <span className="material-symbols-outlined text-sm">badge</span>
              <span>Staff &amp; Trainer Portal</span>
            </div>
            <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">Gym Staff Login</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Sign in with your registered staff email and password provided by the gym owner.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="email">
              Staff Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="trainer@yourgym.com"
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
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1 text-xs"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {state.error && (
            <p className="text-xs text-error font-semibold bg-error-container/40 border border-error/20 p-3 rounded-xl">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-[#856dfa] text-on-primary font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(148,125,255,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isBusy ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                <span>Signing in to Staff Panel...</span>
              </>
            ) : (
              'Sign In to Staff Panel'
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-outline">
            Gym Owner?{' '}
            <Link href="/login" className="text-secondary font-bold hover:underline">
              Owner Panel Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
