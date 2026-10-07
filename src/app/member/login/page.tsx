'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginMember, type MemberLoginState } from '../actions';

const initialState: MemberLoginState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1';
const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-3 text-base text-on-surface focus:outline-none transition-colors';

export default function MemberLoginPage() {
  const [state, formAction, pending] = useActionState(loginMember, initialState);

  return (
    <main className="min-h-screen bg-background text-on-surface flex items-center justify-center p-5">
      <form
        action={formAction}
        className="w-full max-w-md bg-surface-container-low border border-surface-container-high rounded-2xl p-7 space-y-6"
      >
        <div>
          <h1 className="font-sora text-2xl font-bold">Member login</h1>
          <p className="text-sm text-outline mt-1">Use the details your gym sent you.</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="gymCode">Gym code</label>
          <input id="gymCode" name="gymCode" required autoCapitalize="none" autoCorrect="off" className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="memberCode">Member ID</label>
          <input id="memberCode" name="memberCode" required placeholder="MEM-001" autoCapitalize="characters" autoCorrect="off" className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoCapitalize="none" className={inputClass} />
        </div>

        {state.error && <p className="text-sm text-error font-semibold">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full px-4 py-3 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {pending && (
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
          )}
          {pending ? 'Logging in...' : 'Log in'}
        </button>

        <div className="pt-1 flex flex-col items-center gap-2">
          <p className="text-xs text-outline/80 text-center">
            Forgot password or ID? Ask your gym front desk to resend your credentials.
          </p>
          <p className="text-xs text-outline text-center">
            Gym owner or staff?{' '}
            <Link href="/login" className="text-secondary font-semibold">
              Log in here
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
