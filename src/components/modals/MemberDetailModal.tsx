import React, { useState } from 'react';
import { Member, CheckInLog } from '../../types';

interface MemberDetailModalProps {
  member: Member | null;
  onClose: () => void;
  onRenewPlan: (memberId: string) => void;
  onQuickCheckIn: (member: Member) => void;
  recentLogs?: CheckInLog[];
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  onClose,
  onRenewPlan,
  onQuickCheckIn,
  recentLogs = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [renewNotice, setRenewNotice] = useState(false);

  if (!member) return null;

  const memberLogs = recentLogs.filter((log) => log.memberId === member.id);

  const handleCopyWhatsAppLink = () => {
    const text = `Hi ${member.name}, your Iron Pulse membership (${member.rank}) expires on ${member.expiryDate}. Tap here to pay & renew: https://rzp.io/l/ironpulse-${member.id.toLowerCase()}`;
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(
      member.phone.replace(/[^0-9]/g, '')
    )}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenew = () => {
    onRenewPlan(member.id);
    setRenewNotice(true);
    setTimeout(() => setRenewNotice(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-surface-container-low border border-secondary/40 rounded-xl shadow-[0_0_50px_rgba(123,208,255,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Manhwa HUD top corners */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-secondary"></div>
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-secondary"></div>
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-primary"></div>

        {/* Modal Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/40">
              {member.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sora text-base font-semibold text-on-surface">
                  {member.name}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[0.6875rem] font-bold ${
                    member.rank === 'RANK S'
                      ? 'bg-primary-fixed/20 text-primary-fixed border border-primary-fixed/40'
                      : member.rank === 'RANK A'
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : member.rank === 'RANK B'
                      ? 'bg-secondary/20 text-secondary border border-secondary/40'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {member.rank}
                </span>
              </div>
              <p className="text-xs text-outline">{member.email} · {member.phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-on-surface">
          {renewNotice && (
            <div className="p-3 rounded-lg bg-tertiary-container/20 border border-tertiary/40 text-tertiary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>Membership renewed for +365 days! Access pass active.</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
              <span className="text-[0.625rem] text-outline uppercase font-bold">
                Time Remaining
              </span>
              <p
                className={`text-base font-sora font-bold mt-1 ${
                  member.daysLeft <= 3 ? 'text-error' : 'text-secondary'
                }`}
              >
                {member.daysLeft} Days
              </p>
              <span className="text-[0.625rem] text-outline">Expires {member.expiryDate}</span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
              <span className="text-[0.625rem] text-outline uppercase font-bold">
                Cadre Attendance
              </span>
              <p className="text-base font-sora font-bold mt-1 text-tertiary">
                {member.attendanceCountThisMonth} Sessions
              </p>
              <span className="text-[0.625rem] text-outline">This billing cycle</span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
              <span className="text-[0.625rem] text-outline uppercase font-bold">
                Biometric Token
              </span>
              <p className="text-xs font-mono font-bold mt-1.5 text-primary truncate">
                {member.rfidTag}
              </p>
              <span className="text-[0.625rem] text-tertiary">Gate 1 &amp; 2 Cleared</span>
            </div>
          </div>

          {/* Plan Info */}
          <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high flex items-center justify-between">
            <div>
              <span className="text-[0.6875rem] text-outline uppercase font-bold">
                Current Plan
              </span>
              <h4 className="text-sm font-semibold text-on-surface mt-0.5">
                {member.planName} ({member.planDuration})
              </h4>
              <p className="text-[0.6875rem] text-on-surface-variant mt-1">
                Joined: {member.joinDate} · Last Check-in: {member.lastCheckIn || 'Recent'}
              </p>
            </div>
            <button
              onClick={handleRenew}
              className="px-3.5 py-1.5 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container font-bold text-xs transition-all shadow-[0_0_12px_rgba(148,125,255,0.3)] cursor-pointer"
            >
              Extend Plan (+1 Yr)
            </button>
          </div>

          {/* Turnstile Ingress History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline">
                Recent Gate Telemetry
              </span>
              <button
                onClick={() => onQuickCheckIn(member)}
                className="text-[0.6875rem] text-tertiary hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">how_to_reg</span>
                <span>Manual Gate Pass</span>
              </button>
            </div>

            <div className="rounded-lg border border-surface-container-high bg-surface-container-lowest divide-y divide-surface-container-high max-h-36 overflow-y-auto">
              {memberLogs.length > 0 ? (
                memberLogs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-on-surface">{log.gate}</span>
                      <span className="text-[0.625rem] text-outline ml-2">Temp: {log.temperature}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-secondary">{log.time}</span>
                      <span className="px-1.5 py-0.5 rounded bg-tertiary-container/20 text-tertiary text-[0.625rem] font-bold">
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-outline text-xs">
                  No automated gate entries logged yet today.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between">
          <button
            onClick={handleCopyWhatsAppLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold transition-all border border-[#25D366]/30 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">chat</span>
            <span>{copied ? 'WhatsApp Opened!' : 'Send WhatsApp Reminder'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer border border-surface-container-high"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
