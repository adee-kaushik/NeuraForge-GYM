'use client';

import Link from 'next/link';
import { useEffect, useState, useActionState, useTransition } from 'react';
import { loginMember, resetMemberPasswordByPhone, type MemberLoginState, type ResetPasswordResult } from '../actions';

const initialState: MemberLoginState = {};

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';
const inputClass =
  'w-full bg-surface-container-low border border-surface-container-highest focus:border-tertiary focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-base text-on-surface focus:outline-none transition-all';

export default function MemberLoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'reset'>('login');
  const [state, formAction, pending] = useActionState(loginMember, initialState);
  const [showPassword, setShowPassword] = useState(false);

  // Form field states for cross-filling
  const [gymCodeInput, setGymCodeInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Reset password states
  const [resetGymCode, setResetGymCode] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetPending, startResetTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.success) {
      window.location.href = '/member';
    }
  }, [state.success]);

  const isBusy = pending || Boolean(state.success);

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetResult(null);

    if (!resetGymCode.trim() || !resetPhone.trim()) {
      setResetError('Please enter both your Gym Code and registered Phone Number.');
      return;
    }

    startResetTransition(async () => {
      try {
        const res = await resetMemberPasswordByPhone(resetGymCode, resetPhone);
        if (!res.ok) {
          setResetError(res.error || 'Failed to reset password. Please verify your details.');
        } else {
          setResetResult(res);
          // Auto-fill login fields with newly generated credentials
          setGymCodeInput(res.gymCode || resetGymCode);
          setPhoneInput(res.phone || resetPhone);
          if (res.password) setPasswordInput(res.password);
        }
      } catch (err: unknown) {
        setResetError(err instanceof Error ? err.message : 'Error resetting password. Please try again.');
      }
    });
  };

  const handleCopyCredentials = () => {
    if (!resetResult?.password) return;
    const credText = `Gym Code: ${resetResult.gymCode}\nMember ID (Phone): ${resetResult.phone}\nPassword: ${resetResult.password}`;
    navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <span className="text-xs font-bold text-tertiary">Member Pass</span>
        </div>

        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold">
          <Link
            href="/login"
            className="py-2 text-center rounded-lg text-outline hover:text-on-surface transition-colors"
          >
            🏢 Staff & Owner
          </Link>
          <div className="py-2 text-center rounded-lg bg-surface-container-lowest text-on-surface shadow-xs">
            📱 Gym Member
          </div>
        </div>

        {/* Member Action Card with Sign In / Reset Password tabs */}
        <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Card Header & Switcher */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20">
                🔒 Protected Gym Isolation
              </span>
              <div className="flex rounded-lg bg-surface-container p-0.5 border border-surface-container-high text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setResetResult(null);
                  }}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reset');
                    // Pre-fill reset fields if typed in login
                    if (gymCodeInput && !resetGymCode) setResetGymCode(gymCodeInput);
                    if (phoneInput && !resetPhone) setResetPhone(phoneInput);
                  }}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    activeTab === 'reset'
                      ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Reset Password
                </button>
              </div>
            </div>

            <h1 className="font-sora text-2xl font-bold tracking-tight text-on-surface">
              {activeTab === 'login' ? 'Member Digital Pass' : 'Reset Member Password'}
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              {activeTab === 'login'
                ? 'Sign in using your unique gym code and phone number to access your gym pass.'
                : 'Enter your gym code and registered phone number. Your new password will be sent directly to your messages.'}
            </p>
          </div>

          {/* TAB 1: SIGN IN */}
          {activeTab === 'login' && (
            <form action={formAction} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass} htmlFor="gymCode">
                    Unique Gym Code
                  </label>
                  <span className="text-[11px] text-outline">Unique to your gym</span>
                </div>
                <input
                  id="gymCode"
                  name="gymCode"
                  required
                  value={gymCodeInput}
                  onChange={(e) => setGymCodeInput(e.target.value)}
                  placeholder="e.g. iron-fitness (provided by your gym)"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass} htmlFor="memberCode">
                    Member ID (Phone Number)
                  </label>
                  <span className="text-[11px] text-secondary font-semibold">Your registered mobile</span>
                </div>
                <input
                  id="memberCode"
                  name="memberCode"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 9876543210"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass} htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('reset');
                      if (gymCodeInput) setResetGymCode(gymCodeInput);
                      if (phoneInput) setResetPhone(phoneInput);
                    }}
                    className="text-xs font-bold text-secondary hover:underline cursor-pointer"
                  >
                    Forgot / Reset Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoCapitalize="none"
                    placeholder="••••••••"
                    className={`${inputClass} pr-12`}
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

              {state.error && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs font-semibold text-error">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{state.error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isBusy}
                className="w-full px-5 py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
              >
                {isBusy && (
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                )}
                {state.success ? 'Opening Digital Pass...' : pending ? 'Authenticating...' : 'Open My Digital Pass'}
              </button>
            </form>
          )}

          {/* TAB 2: RESET PASSWORD */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              {!resetResult ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className={labelClass} htmlFor="resetGymCode">
                      Gym Code
                    </label>
                    <input
                      id="resetGymCode"
                      required
                      value={resetGymCode}
                      onChange={(e) => setResetGymCode(e.target.value)}
                      placeholder="e.g. iron-fitness"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="resetPhone">
                      Member ID / Registered Phone Number
                    </label>
                    <input
                      id="resetPhone"
                      required
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      placeholder="e.g. 9876543210 (10-digit number)"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className={inputClass}
                    />
                  </div>

                  {resetError && (
                    <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs font-semibold text-error">
                      <span className="material-symbols-outlined text-base shrink-0">error</span>
                      <span>{resetError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isResetPending}
                    className="w-full px-5 py-3.5 rounded-xl bg-secondary text-[#001f28] text-sm sm:text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {isResetPending ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                        <span>Dispatching to Messages...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">send</span>
                        <span>Reset Password &amp; Send to Message</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* SUCCESS VIEW AFTER RESET */
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 rounded-xl bg-tertiary/15 border border-tertiary/30 text-tertiary text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
                    <span>
                      Password reset successful for <b>{resetResult.memberName}</b>! Ready to send to your messages.
                    </span>
                  </div>

                  {/* Generated Credentials Summary */}
                  <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-outline uppercase font-bold text-[10px]">Gym Code:</span>
                      <span className="font-mono font-bold text-on-surface">{resetResult.gymCode}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-outline uppercase font-bold text-[10px]">Member ID (Phone):</span>
                      <span className="font-mono font-bold text-secondary">{resetResult.phone}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-container-high">
                      <span className="text-outline uppercase font-bold text-[10px]">New Password:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-tertiary text-sm select-all">
                          {resetResult.password}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCredentials}
                          className="text-[11px] text-outline hover:text-on-surface font-semibold underline cursor-pointer"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Direct WhatsApp / SMS Action Buttons */}
                  <div className="space-y-2">
                    {resetResult.whatsappUrl && (
                      <a
                        href={resetResult.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">chat</span>
                        <span>Send / Receive on WhatsApp</span>
                      </a>
                    )}

                    {resetResult.smsUrl && (
                      <a
                        href={resetResult.smsUrl}
                        className="w-full py-2.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex items-center justify-center gap-2 border border-surface-container-highest transition-all"
                      >
                        <span className="material-symbols-outlined text-base">sms</span>
                        <span>Send via SMS Message</span>
                      </a>
                    )}
                  </div>

                  {/* Switch to login with prefilled credentials */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90 cursor-pointer"
                  >
                    <span>Proceed to Sign In</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer security disclaimer */}
          <div className="pt-3 border-t border-surface-container-high text-center space-y-2">
            <p className="text-[11px] text-outline">
              🔒 Strict isolation: You can only view your own gym pass using your unique Gym Code.
            </p>
            <p className="text-xs text-outline">
              Gym owner or front desk?{' '}
              <Link href="/login" className="text-secondary font-bold hover:underline">
                Log in to Staff Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
