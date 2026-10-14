'use client';

import React, { useState } from 'react';
import { EnrollmentRecord } from '@/types';
import { approveEnrollment, rejectEnrollment } from '@/actions/enrollments';

interface PendingEnrollmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollments: EnrollmentRecord[];
  onRefresh: () => void;
  onMemberApproved?: () => void;
  showToast?: (msg: string) => void;
}

export const PendingEnrollmentsModal: React.FC<PendingEnrollmentsModalProps> = ({
  isOpen,
  onClose,
  enrollments,
  onRefresh,
  onMemberApproved,
  showToast,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApprove = async (e: EnrollmentRecord) => {
    setBusyId(e.id);
    const res = await approveEnrollment(e.id);
    setBusyId(null);
    if ('memberId' in res) {
      if (showToast) {
        showToast(`✅ ${res.memberName} approved! Assigned Member ID: ${res.memberCode}`);
      }
      onRefresh();
      if (onMemberApproved) onMemberApproved();
    } else {
      alert(`Approval error: ${'error' in res ? res.error : 'Failed to approve'}`);
    }
  };

  const handleReject = async (e: EnrollmentRecord) => {
    const reason = prompt(`Reason for rejecting ${e.name}'s self-enrollment?`, 'Payment verification pending / invalid details');
    if (reason === null) return;

    setRejectingId(e.id);
    const res = await rejectEnrollment(e.id, reason);
    setRejectingId(null);
    if (res.ok) {
      if (showToast) showToast(`Enrollment for ${e.name} rejected.`);
      onRefresh();
    } else {
      alert(`Rejection error: ${'error' in res ? res.error : 'Failed to reject'}`);
    }
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const text = encodeURIComponent(`Hi ${name}, greeting from gym front desk! We received your self-enrollment.`);
    window.open(`https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface-container-low border border-secondary/40 rounded-2xl shadow-[0_0_60px_rgba(123,208,255,0.25)] overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-xl text-secondary">how_to_reg</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                  Pending Self-Enrollments
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/20 text-secondary border border-secondary/40">
                  {enrollments.length} Pending
                </span>
              </div>
              <p className="text-[11px] text-outline">
                Candidates who scanned Front Desk QR and submitted their details &amp; UPI payment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer rounded-lg hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5">
          {enrollments.map((enr) => {
            const isBusy = busyId === enr.id;
            const isRejecting = rejectingId === enr.id;

            return (
              <div
                key={enr.id}
                className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high hover:border-secondary/40 transition-all space-y-3 shadow-sm"
              >
                {/* Top Row: Candidate name, plan, amount */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 text-secondary border border-secondary/40 flex items-center justify-center font-bold text-sm">
                      {enr.name ? enr.name[0].toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sora text-sm font-bold text-on-surface">{enr.name}</span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                          {enr.planName}
                        </span>
                        {enr.timingSlot && (
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                            enr.timingSlot === 'MORNING'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-400/30'
                              : enr.timingSlot === 'EVENING'
                              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-400/30'
                              : 'bg-primary/10 text-primary border-primary/30'
                          }`}>
                            {enr.timingSlot === 'MORNING' ? '🌅 Morning' : enr.timingSlot === 'EVENING' ? '🌇 Evening' : '⚡ Flexible'}
                          </span>
                        )}
                        {enr.bmi && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30">
                            BMI {enr.bmi} ({enr.bmiCategory || 'Recorded'})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-outline flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>📱 {enr.phone}</span>
                        {enr.email && <span>· ✉️ {enr.email}</span>}
                        {enr.dob && <span>· 🎂 DOB: {enr.dob}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-sora text-base font-extrabold text-[#4edea3]">
                      ₹{enr.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="block text-[10px] text-outline">
                      {new Date(enr.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Payment & UTR verification */}
                <div className="p-2.5 rounded-lg bg-surface-container border border-surface-container-high flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="material-symbols-outlined text-base text-secondary">receipt_long</span>
                    {enr.utrNumber ? (
                      <span className="font-mono text-xs text-secondary font-bold">
                        UPI UTR: {enr.utrNumber}
                      </span>
                    ) : (
                      <span className="text-amber-300 font-semibold">
                        Cash Payment Pending at Counter
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      enr.utrNumber
                        ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                        : 'bg-amber-500/15 text-amber-300 border-amber-400/40'
                    }`}
                  >
                    {enr.utrNumber ? 'UPI Verification Ready' : 'Desk Cash Pending'}
                  </span>
                </div>

                {/* Action Buttons: 1-Tap Approve & Biometric Setup, WhatsApp, Reject */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-container-high">
                  <button
                    type="button"
                    onClick={() => handleWhatsApp(enr.phone, enr.name)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold transition-all border border-[#25D366]/30 cursor-pointer"
                    title="Chat with candidate on WhatsApp"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    <span>WhatsApp</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isRejecting || isBusy}
                      onClick={() => handleReject(enr)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-error/20 text-outline hover:text-error text-xs font-bold border border-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isRejecting ? 'Rejecting...' : 'Reject'}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy || isRejecting}
                      onClick={() => handleApprove(enr)}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-secondary to-[#4edea3] text-slate-950 text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isBusy && (
                        <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                      )}
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>Approve &amp; Activate</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {enrollments.length === 0 && (
            <div className="py-12 px-4 text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline/40">check_circle</span>
              <p className="font-sora text-sm font-bold text-on-surface">No Pending Self-Enrollments</p>
              <p className="text-xs text-outline max-w-sm mx-auto">
                All prospective members from the Front Desk QR have been approved or processed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
