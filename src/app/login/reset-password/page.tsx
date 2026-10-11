import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import ResetForm from './reset-form';

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const hasLink = !!data?.claims;

  return (
    <main className="min-h-screen bg-background text-on-surface flex flex-col justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between px-1">
          <Link href="/login" className="inline-flex items-center gap-1 text-xs font-bold text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Login
          </Link>
          <span className="text-xs font-bold text-secondary">NeuraForge Gym OS</span>
        </div>

        <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
          <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">Set a new password</h1>

          {hasLink ? (
            <ResetForm />
          ) : (
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
          )}
        </div>
      </div>
    </main>
  );
}
