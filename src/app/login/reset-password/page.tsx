import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import ResetForm from './reset-form';

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hasServerUser = !!user;

  return (
    <main className="min-h-screen bg-background text-on-surface flex flex-col justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between px-1">
          <Link href="/login" className="inline-flex items-center gap-1 text-xs font-bold text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Login
          </Link>
          <img src="/logo.png" alt="NeuraFitness" className="h-6 w-auto object-contain" />
        </div>

        <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
          <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">Set a new password</h1>

          <ResetForm hasServerUser={hasServerUser} />
        </div>
      </div>
    </main>
  );
}
