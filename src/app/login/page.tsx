'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginOwner, type LoginState } from './actions';

const initialState: LoginState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1';
const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2.5 text-sm text-on-surface focus:outline-none transition-colors';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginOwner, initialState);

  return (
    <main className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4">
      <form
        action={formAction}
        className="w-full max-w-md bg-surface-container-low border border-surface-container-high rounded-xl p-6 space-y-4"
      >
        <div>
          <h1 className="font-sora text-xl font-bold">Owner login</h1>
          <p className="text-xs text-outline mt-1">Log in to manage your gym.</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required className={inputClass} />
        </div>

        <div className="flex justify-end">
          <Link href="/login/forgot-password" className="text-xs text-secondary font-semibold hover:underline">
            Forgot password?
          </Link>
        </div>

        {state.error && <p className="text-xs text-error font-semibold">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full px-4 py-2.5 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {pending && (
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
          )}
          {pending ? 'Logging in...' : 'Log in'}
        </button>

        <p className="text-xs text-outline text-center">
          New gym?{' '}
          <Link href="/signup" className="text-secondary font-semibold">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}