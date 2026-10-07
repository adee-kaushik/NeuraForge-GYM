'use client';

import Link from 'next/link';
import { useState } from 'react';
import { requestPasswordReset } from './actions';

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

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
    <main className="min-h-screen bg-background text-on-surface flex flex-col justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Navigation Bar / Return to Login */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-bold text-outline hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Login
          </Link>
          <span className="text-xs font-bold text-secondary">NeuraForge Gym OS</span>
        </div>

        <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div>
            <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">Reset Password</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Enter your email and we&apos;ll send you a secure link to reset your account password.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl border border-tertiary/30 bg-tertiary/10">
                <span className="material-symbols-outlined text-tertiary text-2xl">check_circle</span>
                <div>
                  <p className="text-sm font-bold text-on-surface">Check your email</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    We sent a password reset link to <b>{email}</b>. It may take a minute to arrive.
                  </p>
                </div>
              </div>
              <p className="text-xs text-outline text-center pt-2">
                <Link href="/login" className="text-secondary font-bold hover:underline">
                  Back to login
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass} htmlFor="email">
                  Registered Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="owner@yourgym.com"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs font-semibold text-error">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{error}</span>
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
                {pending ? 'Sending reset link...' : 'Send reset link'}
              </button>

              <p className="text-xs text-outline text-center pt-2 border-t border-surface-container-high">
                Remember your password?{' '}
                <Link href="/login" className="text-secondary font-bold hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
