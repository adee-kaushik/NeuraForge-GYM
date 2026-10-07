'use client';

import Link from 'next/link';
import { useState } from 'react';
import { requestPasswordReset } from './actions';

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1';
const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2.5 text-sm text-on-surface focus:outline-none transition-colors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setPending(true);
    setError('');
    const res = await requestPasswordReset(email.trim().toLowerCase());
    setPending(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSent(true);
    }
  };

  return (
    <main className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-low border border-surface-container-high rounded-xl p-6 space-y-4">
        <div>
          <h1 className="font-sora text-xl font-bold">Reset password</h1>
          <p className="text-xs text-outline mt-1">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border border-tertiary/30 bg-tertiary/10">
              <span className="material-symbols-outlined text-tertiary text-xl">check_circle</span>
              <div>
                <p className="text-sm font-semibold text-on-surface">Check your email</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  We sent a password reset link to <b>{email}</b>. It may take a minute to arrive.
                </p>
              </div>
            </div>
            <p className="text-xs text-outline text-center">
              <Link href="/login" className="text-secondary font-semibold">
                Back to login
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            {error && <p className="text-xs text-error font-semibold">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full px-4 py-2.5 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {pending && (
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
              )}
              {pending ? 'Sending...' : 'Send reset link'}
            </button>

            <p className="text-xs text-outline text-center">
              Remember your password?{' '}
              <Link href="/login" className="text-secondary font-semibold">
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
