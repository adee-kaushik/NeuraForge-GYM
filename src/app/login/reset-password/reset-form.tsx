'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { updatePassword, type ResetState } from './actions';

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

const initial: ResetState = {};

export default function ResetForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initial);

  if (state.done) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-tertiary/30 bg-tertiary/10">
          <span className="material-symbols-outlined text-tertiary text-2xl">check_circle</span>
          <div>
            <p className="text-sm font-bold text-on-surface">Password updated</p>
            <p className="text-xs text-on-surface-variant mt-0.5">You can log in with your new password now.</p>
          </div>
        </div>
        <Link
          href="/login"
          className="block w-full text-center px-5 py-3.5 rounded-xl bg-primary text-on-primary text-sm font-bold"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className={labelClass} htmlFor="password">New password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </div>

      {state.error && (
        <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs font-semibold text-error">{state.error}</div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-5 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold disabled:opacity-60 cursor-pointer"
      >
        {pending ? 'Saving...' : 'Set new password'}
      </button>
    </form>
  );
}
