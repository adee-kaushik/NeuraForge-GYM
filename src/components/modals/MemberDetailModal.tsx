import React, { useState } from 'react';
import { Member, CheckInLog } from '../../types';
import { formatTimestamp } from '../../lib/format';
import { createMemberLogin, resetMemberPassword, type MemberLoginResult } from '@/actions/member-login';

interface MemberDetailModalProps {
  member: Member | null;
  gymName: string;
  onClose: () => void;
  onRenewPlan: (memberId: string) => void;
  onEdit: (member: Member) => void;
  onQuickCheckIn: (member: Member) => void;
  onExtendMembership?: (memberId: string, days: number) => Promise<boolean> | void;
  recentLogs?: CheckInLog[];
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  gymName,
  onClose,
  onRenewPlan,
  onEdit,
  onQuickCheckIn,
  onExtendMembership,
  recentLogs = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState<{ memberId: string; result: MemberLoginResult } | null>(null);
  const [renewBusy, setRenewBusy] = useState(false);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const [showExtendBox, setShowExtendBox] = useState(false);
  const [extendDays, setExtendDays] = useState(14);
  const [customDays, setCustomDays] = useState('');
  const [extendBusy, setExtendBusy] = useState(false);

  if (!member) return null;

  const shown = login?.memberId === member.id ? login.result : null;
  const created = shown && 'password' in shown ? shown : null;
  const failure = shown && 'error' in shown ? shown.error : null;
  const hasLogin = member.hasLogin || created !== null;

  const handleLogin = async () => {
    setBusy(true);
    const result = await (hasLogin ? resetMemberPassword : createMemberLogin)(member.id);
    setBusy(false);
    setLogin({ memberId: member.id, result });
  };

  const sendLoginOnWhatsApp = (r: { gymCode: string; memberCode: string; password: string }) => {
    const text = `Hi ${member.name}, your ${gymName} member login:\nGym code: ${r.gymCode}\nMember ID: ${r.memberCode}\nPassword: ${r.password}\nLogin: ${window.location.origin}/member/login`;
    window.open(
      `https://api.whatsapp.com/send?phone=${encodeURIComponent(member.phone.replace(/[^0-9]/g, ''))}&text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  const memberLogs = recentLogs.filter((log) => log.memberId === member.id).slice(0, 5);

  const handleCopyWhatsAppLink = () => {
    const text = member.status === 'expired'
      ? `Hi ${member.name}, your ${gymName} membership expired on ${member.expiryDate}. Please renew to continue your workouts.`
      : `Hi ${member.name}, your ${gymName} membership expires on ${member.expiryDate}. Please renew to keep your membership active.`;
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(
      member.phone.replace(/[^0-9]/g, '')
    )}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenew = async () => {
    setRenewBusy(true);
    await onRenewPlan(member.id);
    setRenewBusy(false);
  };

  const handleQuickCheckIn = async () => {
    setCheckInBusy(true);
    await onQuickCheckIn(member);
    setCheckInBusy(false);
  };

  const targetDays = customDays ? parseInt(customDays, 10) || 0 : extendDays;
  const currentExpiry = new Date(member.expiresAt);
  const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
  const estimatedDate = new Date(baseDate.getTime() + targetDays * 24 * 60 * 60 * 1000);
  const previewExpiryStr =
    targetDays > 0
      ? estimatedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

  const handleExtend = async () => {
    const days = customDays ? parseInt(customDays, 10) : extendDays;
    if (!Number.isFinite(days) || days <= 0 || !onExtendMembership) return;
    setExtendBusy(true);
    await onExtendMembership(member.id, days);
    setExtendBusy(false);
    setShowExtendBox(false);
    setCustomDays('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-surface-container-low border border-secondary/40 rounded-xl shadow-[0_0_50px_rgba(123,208,255,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Corner accents */}
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
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/20 text-primary border border-primary/40">{member.planDuration}</span>
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

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
              <span className="text-xs text-outline uppercase font-bold">
                Time Remaining
              </span>
              <p
                className={`text-base font-sora font-bold mt-1 ${
                  member.daysLeft <= 3 ? 'text-error' : 'text-secondary'
                }`}
              >
                {member.daysLeft < 0 ? 'Expired' : `${member.daysLeft} Days`}
              </p>
              <span className="text-xs text-outline">Expires {member.expiryDate}</span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
              <span className="text-xs text-outline uppercase font-bold">
                Attendance
              </span>
              <p className="text-base font-sora font-bold mt-1 text-tertiary">
                {member.attendanceCountThisMonth} Sessions
              </p>
              <span className="text-xs text-outline">This month</span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
              <span className="text-xs text-outline uppercase font-bold">
                Member Since
              </span>
              <p className="text-xs font-mono font-bold mt-1.5 text-primary truncate">
                {member.joinDate}
              </p>
              <span className="text-xs text-outline">Joined the gym</span>
            </div>
          </div>

          {/* Plan Info */}
          <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-outline uppercase font-bold">
                  Current Plan
                </span>
                <h4 className="text-sm font-semibold text-on-surface mt-0.5">
                  {member.planName} ({member.planDuration})
                </h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Joined: {member.joinDate} · Last Check-in: {member.lastCheckIn || 'No visits yet'}
                </p>
                <button
                  onClick={() => onEdit(member)}
                  className="mt-2 text-xs font-bold text-secondary hover:underline cursor-pointer"
                >
                  Edit details
                </button>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {onExtendMembership && (
                  <button
                    onClick={() => setShowExtendBox(!showExtendBox)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-on-surface font-bold text-xs transition-all border border-secondary/30 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">pause_circle</span>
                    <span>{showExtendBox ? 'Close Pause' : 'Freeze / Extend'}</span>
                  </button>
                )}
                <button
                  onClick={handleRenew}
                  disabled={renewBusy}
                  className="px-3.5 py-1.5 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container font-bold text-xs transition-all shadow-[0_0_12px_rgba(148,125,255,0.3)] cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {renewBusy && (
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  )}
                  {renewBusy ? 'Renewing...' : `Renew ${member.planName}`}
                </button>
              </div>
            </div>

            {/* Collapsible Freeze / Extend Panel */}
            {showExtendBox && (
              <div className="pt-3 border-t border-surface-container-high/60 space-y-3 bg-surface-container-lowest/60 p-3.5 rounded-lg border border-secondary/20">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-secondary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">date_range</span>
                    <span>Extend Plan Expiry / Holiday Pause</span>
                  </span>
                  <span className="text-[11px] text-outline">
                    Expires: <b className="text-on-surface">{member.expiryDate}</b>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[7, 14, 21, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setExtendDays(d);
                        setCustomDays('');
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                        !customDays && extendDays === d
                          ? 'bg-secondary text-[#001f28] font-bold'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      +{d} Days {d === 7 ? '(1w)' : d === 14 ? '(2w)' : d === 30 ? '(1m)' : ''}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-outline">Custom:</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="Days"
                      className="w-16 bg-surface-container px-2 py-1 rounded text-xs text-on-surface border border-surface-container-high focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                {previewExpiryStr && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-outline">
                      New expiry date: <span className="text-tertiary font-bold">{previewExpiryStr}</span>
                    </span>
                    <button
                      onClick={handleExtend}
                      disabled={extendBusy}
                      className="px-3.5 py-1.5 rounded-lg bg-[#4edea3] hover:bg-[#34c78b] text-[#002113] font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {extendBusy && (
                        <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                      )}
                      <span>{extendBusy ? 'Extending...' : `Confirm +${targetDays} Days`}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Member app login */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">Member app login</span>
              <button
                onClick={handleLogin}
                disabled={busy}
                className="text-xs text-secondary hover:underline font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {busy && (
                  <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                )}
                {busy ? 'Please wait...' : hasLogin ? 'Reset password' : 'Create login'}
              </button>
            </div>
            {created ? (
              <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-xs space-y-1">
                <p className="text-on-surface">
                  Gym code: <b>{created.gymCode}</b> · Member ID: <b>{created.memberCode}</b>
                </p>
                <p className="text-on-surface">
                  Password: <b className="font-mono">{created.password}</b>
                </p>
                <p className="text-outline">Shown only once. Send it to the member now.</p>
                <button
                  onClick={() => sendLoginOnWhatsApp(created)}
                  className="font-bold text-tertiary hover:underline cursor-pointer"
                >
                  Send on WhatsApp
                </button>
              </div>
            ) : failure ? (
              <p className="text-xs text-error">{failure}</p>
            ) : (
              <p className="text-xs text-outline">
                {hasLogin ? 'This member can log in to the member app.' : 'No login yet.'}
              </p>
            )}
          </div>

          {/* Recent check-ins */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">
                Recent Check-ins
              </span>
              <button
                onClick={handleQuickCheckIn}
                disabled={checkInBusy}
                className="text-xs text-tertiary hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {checkInBusy ? (
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">how_to_reg</span>
                )}
                <span>{checkInBusy ? 'Marking...' : 'Mark Present'}</span>
              </button>
            </div>

            <div className="rounded-lg border border-surface-container-high bg-surface-container-lowest divide-y divide-surface-container-high max-h-36 overflow-y-auto">
              {memberLogs.length > 0 ? (
                memberLogs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface">Checked in</span>
                    <span className="font-mono text-secondary">{formatTimestamp(log.checkedInAt)}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-outline text-xs">
                  No check-ins yet.
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
