'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { updatePassword, type ResetState } from './actions';
import { createClient } from '@/utils/supabase/client';

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-secondary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

export default function ResetForm({ hasServerUser }: { hasServerUser: boolean }) {
  const [checking, setChecking] = useState(!hasServerUser);
  const [hasValidSession, setHasValidSession] = useState(hasServerUser);
  const [clientToken, setClientToken] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ResetState>({});

  useEffect(() => {
    if (hasServerUser) {
      setHasValidSession(true);
      setChecking(false);
      return;
    }

    let isMounted = true;
    const checkClientAuth = async () => {
      try {
        const hash = typeof window !== 'undefined' && window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        const supabase = createClient();

        if (accessToken) {
          if (isMounted) setClientToken(accessToken);
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (isMounted) {
            setHasValidSession(true);
            setChecking(false);
          }
          return;
        }

        // Also check if an active recovery session exists in client
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          if (isMounted) {
            setClientToken(sessionData.session.access_token);
            setHasValidSession(true);
            setChecking(false);
          }
          return;
        }
      } catch (err) {
        console.error('Client recovery verification error:', err);
      }

      if (isMounted) {
        setHasValidSession(false);
        setChecking(false);
      }
    };

    checkClientAuth();
    return () => { isMounted = false; };
  }, [hasServerUser]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({});
    const form = e.currentTarget;
    const formData = new FormData(form);
    if (clientToken) {
      formData.set('accessToken', clientToken);
    }

    startTransition(async () => {
      const res = await updatePassword({}, formData);
      setState(res);

      if (res.done) {
        try {
          const supabase = createClient();
          await supabase.auth.signOut().catch(() => {});
        } catch {}
      }
    });
  };

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

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-on-surface-variant">
        <div className="w-7 h-7 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Verifying secure reset link...</p>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">
          This reset link has expired or was already used. Request a new one.
        </p>
        <Link
          href="/login/forgot-password"
          className="block w-full text-center px-5 py-3.5 rounded-xl bg-primary text-on-primary text-sm font-bold"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="accessToken" value={clientToken} />

      <div>
        <label className={labelClass} htmlFor="password">New password</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            className={`${inputClass} pr-12`}
            placeholder="••••••••"
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

      <div>
        <label className={labelClass} htmlFor="confirm">Confirm new password</label>
        <div className="relative">
          <input
            id="confirm"
            name="confirm"
            type={showConfirm ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            className={`${inputClass} pr-12`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface focus:outline-none p-1 transition-colors cursor-pointer"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            <span className="material-symbols-outlined text-xl select-none leading-none">
              {showConfirm ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>

      {state.error && (
        <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs font-semibold text-error">{state.error}</div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-5 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold disabled:opacity-60 cursor-pointer"
      >
        {isPending ? 'Updating password...' : 'Update password'}
      </button>
    </form>
  );
}
