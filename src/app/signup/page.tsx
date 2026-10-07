'use client';

import { useActionState } from 'react';
import { signupOwner, type SignupState } from './actions';

const initialState: SignupState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1';
const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2.5 text-sm text-on-surface focus:outline-none transition-colors';

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupOwner, initialState);

  return (
    <main className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4">
      <form
        action={formAction}
        className="w-full max-w-md bg-surface-container-low border border-surface-container-high rounded-xl p-6 space-y-4"
      >
        <div>
          <h1 className="font-sora text-xl font-bold">Create your gym account</h1>
          <p className="text-xs text-outline mt-1">Set up your gym on NeuraForge in a minute.</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="gymName">Gym name</label>
          <input id="gymName" name="gymName" required className={inputClass} placeholder="Iron Pulse Gym" />
        </div>

        <div>
          <label className={labelClass} htmlFor="slug">Gym code</label>
          <input id="slug" name="slug" required className={inputClass} placeholder="ironpulse" />
          <p className="text-xs text-outline mt-1">Your members will type this code to log in. Lowercase letters, numbers, hyphens.</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="name">Your name</label>
          <input id="name" name="name" required className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required minLength={8} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="inviteCode">Invite code</label>
          <input id="inviteCode" name="inviteCode" required autoComplete="off" className={inputClass} />
        </div>

        {state.error && <p className="text-xs text-error font-semibold">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full px-4 py-2.5 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-sm font-bold disabled:opacity-60"
        >
          {pending ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </main>
  );
} 