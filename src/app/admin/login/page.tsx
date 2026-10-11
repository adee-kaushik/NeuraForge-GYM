'use client';

import Link from 'next/link';
import { useEffect, useState, useActionState } from 'react';
import { loginAdmin, type LoginState } from '@/app/login/actions';

const initialState: LoginState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.success) {
      window.location.href = '/admin';
    }
  }, [state.success]);

  const isBusy = pending || Boolean(state.success);

  return (
    <main className="min-h-screen bg-background text-on-surface flex flex-col justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Top return nav */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-bold text-outline hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Home
          </Link>
          <span className="text-xs font-bold text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">flight_takeoff</span>
            NeuraFitness Master
          </span>
        </div>

        {/* 3-Way Role Switcher Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold">
          <Link
            href="/login"
            className="py-2 text-center rounded-lg text-outline hover:text-on-surface transition-colors"
          >
            🏢 Staff
          </Link>
          <Link
            href="/member/login"
            className="py-2 text-center rounded-lg text-outline hover:text-on-surface transition-colors"
          >
            📱 Member
          </Link>
          <div className="py-2 text-center rounded-lg bg-surface-container-lowest text-secondary shadow-xs font-extrabold flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-xs">shield</span>
            Admin
          </div>
        </div>

        {/* Admin Login Card */}
        <form
          action={formAction}
          className="bg-surface-container-lowest border border-secondary/30 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl relative overflow-hidden"
        >
          {/* Top highlight glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-primary to-secondary" />

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30 uppercase tracking-widest font-mono">
                CO-FOUNDER CLEARANCE
              </span>
              <span className="text-[10px] text-outline font-mono">LEVEL 4</span>
            </div>
            <h1 className="font-sora text-2xl font-black tracking-tight text-on-surface flex items-center gap-2">
              <span>Admin Cockpit</span>
              <span className="material-symbols-outlined text-secondary text-2xl">admin_panel_settings</span>
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Sign in with your authorized co-founder or system administrator account.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="email">
              Admin Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="founder@neurafitness.com"
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-outline" htmlFor="password">
                Admin Password
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
                className={`${inputClass} pr-12 font-mono`}
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

          {state.error && (
            <div className="p-3.5 rounded-xl bg-error/15 border border-error/30 flex items-center gap-2 text-xs font-semibold text-error animate-in zoom-in-95">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{state.error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full bg-secondary text-on-secondary font-extrabold text-sm py-3.5 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isBusy ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                <span>Authenticating Superadmin...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">flight_takeoff</span>
                <span>Enter Admin Cockpit</span>
              </>
            )}
          </button>

          <div className="pt-2 text-center border-t border-surface-container-high">
            <p className="text-xs text-outline">
              Standard gym owner?{' '}
              <Link href="/login" className="text-secondary font-bold hover:underline">
                Sign in to Gym Dashboard
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
