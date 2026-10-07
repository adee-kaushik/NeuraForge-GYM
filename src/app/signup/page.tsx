'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signupOwner, type SignupState } from './actions';

const initialState: SignupState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupOwner, initialState);

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
          <span className="text-xs font-bold text-secondary">NeuraForge Gym OS</span>
        </div>

        <form
          action={formAction}
          className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm"
        >
          <div>
            <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">Create Gym Account</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Set up your gym on NeuraForge in under 2 minutes.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="gymName">
              Gym Name
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
              Gym Code / URL Slug
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
              Your members will use this code to log into their digital passes.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="name">
              Owner Name
            </label>
            <input id="name" name="name" required className={inputClass} placeholder="Full Name" />
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
              className={inputClass}
              placeholder="owner@yourgym.com"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="password">
              Password (min 8 characters)
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

          <div>
            <label className={labelClass} htmlFor="inviteCode">
              Invite Code
            </label>
            <input
              id="inviteCode"
              name="inviteCode"
              required
              autoComplete="off"
              className={inputClass}
              placeholder="Enter beta invite code"
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
            className="w-full px-5 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer mt-2"
          >
            {pending && (
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            )}
            {pending ? 'Creating Gym OS Account...' : 'Create Gym Account'}
          </button>

          <p className="text-xs text-outline text-center pt-2 border-t border-surface-container-high">
            Already have an account?{' '}
            <Link href="/login" className="text-secondary font-bold hover:underline">
              Log in here
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}