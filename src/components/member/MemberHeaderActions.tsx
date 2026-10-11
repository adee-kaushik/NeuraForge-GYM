'use client';

import React, { useState, useTransition } from 'react';
import { logoutMember, resetMemberPasswordByPhone, type ResetPasswordResult } from '@/app/member/actions';

interface MemberHeaderActionsProps {
  gymCode: string;
  phone: string;
  memberName: string;
}

export const MemberHeaderActions: React.FC<MemberHeaderActionsProps> = ({ gymCode, phone, memberName }) => {
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<ResetPasswordResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleResetPassword = () => {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await resetMemberPasswordByPhone(gymCode, phone);
        if (!res.ok) {
          setError(res.error || 'Failed to reset password.');
        } else {
          setResult(res);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error resetting password.');
      }
    });
  };

  const handleCopy = () => {
    if (!result?.password) return;
    navigator.clipboard.writeText(result.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setShowModal(true);
            setResult(null);
            setError(null);
          }}
          className="text-xs font-bold text-secondary hover:underline cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">lock_reset</span>
          <span>Reset Password</span>
        </button>

        <form action={logoutMember}>
          <button
            type="submit"
            className="text-xs font-bold text-outline hover:text-on-surface hover:underline cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Log out</span>
          </button>
        </form>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-surface-container-low border border-secondary/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">vpn_key</span>
                <h3 className="font-sora text-base font-bold text-on-surface">Reset Password</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-outline hover:text-on-surface p-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {!result ? (
              <div className="space-y-4 text-xs text-on-surface">
                <p className="text-on-surface-variant leading-relaxed">
                  Reset your password for <b>{memberName}</b>. A new random secure password will be generated and dispatched to your registered phone message / WhatsApp.
                </p>

                <div className="p-3 rounded-xl bg-surface-container border border-surface-container-high space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-outline">Gym Code:</span>
                    <span className="font-bold text-on-surface">{gymCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Member ID (Phone):</span>
                    <span className="font-bold text-secondary">{phone}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-error/15 border border-error/30 text-error font-semibold text-xs">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2 rounded-xl bg-surface-container-high text-outline hover:text-on-surface font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isPending}
                    className="flex-1 py-2 rounded-xl bg-secondary text-[#001f28] font-bold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">send</span>
                        <span>Send to Message</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-tertiary/15 border border-tertiary/30 text-tertiary font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>New password created &amp; ready to send to your message!</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-outline uppercase text-[10px] font-bold">New Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-tertiary select-all">{result.password}</span>
                      <button
                        onClick={handleCopy}
                        className="text-[10px] text-outline hover:text-on-surface underline font-bold cursor-pointer"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {result.whatsappUrl && (
                    <a
                      href={result.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-black font-bold flex items-center justify-center gap-2 shadow-sm text-center"
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      <span>Open in WhatsApp</span>
                    </a>
                  )}

                  {result.smsUrl && (
                    <a
                      href={result.smsUrl}
                      className="w-full py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold flex items-center justify-center gap-2 border border-surface-container-highest text-center"
                    >
                      <span className="material-symbols-outlined text-sm">sms</span>
                      <span>Send via SMS Message</span>
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-2 rounded-xl bg-primary text-on-primary font-bold cursor-pointer hover:opacity-90 transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
