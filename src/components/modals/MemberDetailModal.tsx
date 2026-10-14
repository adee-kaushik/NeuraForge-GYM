import React, { useState } from 'react';
import { Member, CheckInLog } from '../../types';
import { formatTimestamp } from '../../lib/format';
import { createMemberLogin, resetMemberPassword, revokeMemberLogin, type MemberLoginResult } from '@/actions/member-login';

interface MemberDetailModalProps {
  member: Member | null;
  gymName: string;
  onClose: () => void;
  onRenewPlan: (memberId: string) => void;
  onRenewWithDue?: (input: {
    memberId: string;
    customRenewalDays?: number;
    discountAmount?: number;
    isPartialPayment?: boolean;
    amountPaidNow?: number;
  }) => Promise<boolean> | void;
  onEdit: (member: Member) => void;
  onExtendMembership?: (memberId: string, days: number) => Promise<boolean> | void;
  onWishBirthday?: (member: Member) => void;
  recentLogs?: CheckInLog[];
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  gymName,
  onClose,
  onRenewPlan,
  onRenewWithDue,
  onEdit,
  onExtendMembership,
  onWishBirthday,
  recentLogs = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [loginRevoked, setLoginRevoked] = useState(false);
  const [login, setLogin] = useState<{ memberId: string; result: MemberLoginResult } | null>(null);
  const [renewBusy, setRenewBusy] = useState(false);
  const [showExtendBox, setShowExtendBox] = useState(false);
  const [extendDays, setExtendDays] = useState(14);
  const [customDays, setCustomDays] = useState('');
  const [extendBusy, setExtendBusy] = useState(false);

  // Renew with Due / Custom Days
  const [showRenewDueBox, setShowRenewDueBox] = useState(false);
  const [renewDueDays, setRenewDueDays] = useState(30);
  const [renewCustomDays, setRenewCustomDays] = useState('');
  const [renewDiscount, setRenewDiscount] = useState('');
  const [renewIsPartial, setRenewIsPartial] = useState(false);
  const [renewPaidNow, setRenewPaidNow] = useState('');
  const [renewDueBusy, setRenewDueBusy] = useState(false);

  if (!member) return null;

  const isExpired = member.daysLeft < 0 || member.status === 'expired';
  const shown = login?.memberId === member.id ? login.result : null;
  const created = shown && 'password' in shown ? shown : null;
  const failure = shown && 'error' in shown ? shown.error : null;
  const hasLogin = (member.hasLogin || created !== null) && !loginRevoked;

  const handleLogin = async () => {
    setBusy(true);
    const result = await (hasLogin ? resetMemberPassword : createMemberLogin)(member.id);
    setBusy(false);
    setLogin({ memberId: member.id, result });
    setLoginRevoked(false);
  };

  const handleRevokeLogin = async () => {
    if (!confirm(`Are you sure you want to remove digital pass login access for ${member.name}? They will no longer be able to log in.`)) return;
    setRevokeBusy(true);
    const res = await revokeMemberLogin(member.id);
    setRevokeBusy(false);
    if (res.ok) {
      setLoginRevoked(true);
      setLogin(null);
    }
  };

  const sendLoginOnWhatsApp = (r: { gymCode: string; memberCode: string; password?: string }) => {
    const text = `Hi ${member.name}, your ${gymName} digital pass access:\nGym Code: ${r.gymCode}\nMember ID (Phone): ${r.memberCode}\nPass Link: ${window.location.origin}/member/login\n(No password required - simply enter your Gym Code and Phone Number!)`;
    const digits = member.phone.replace(/[^0-9]/g, '');
    const waPhone = digits.length === 10 ? `91${digits}` : digits;
    window.open(
      `https://api.whatsapp.com/send?phone=${encodeURIComponent(waPhone)}&text=${encodeURIComponent(text)}`,
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

  const handleRenewWithDueSubmit = async () => {
    if (!onRenewWithDue || !member) return;
    setRenewDueBusy(true);
    const resolvedDays = renewCustomDays ? parseInt(renewCustomDays, 10) || 30 : renewDueDays;
    const discount = parseFloat(renewDiscount) || 0;
    const paid = renewIsPartial ? parseFloat(renewPaidNow) || 0 : undefined;
    await onRenewWithDue({
      memberId: member.id,
      customRenewalDays: resolvedDays,
      discountAmount: discount,
      isPartialPayment: renewIsPartial,
      amountPaidNow: paid,
    });
    setRenewDueBusy(false);
    setShowRenewDueBox(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className={`relative w-full max-w-xl bg-surface-container-low border rounded-xl overflow-hidden flex flex-col max-h-[92vh] ${
        isExpired
          ? 'border-rose-500/50 shadow-[0_0_50px_rgba(244,63,94,0.22)]'
          : 'border-secondary/40 shadow-[0_0_50px_rgba(123,208,255,0.25)]'
      }`}>
        {/* Corner accents */}
        <div className={`absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 ${isExpired ? 'border-rose-500' : 'border-secondary'}`}></div>
        <div className={`absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 ${isExpired ? 'border-rose-500' : 'border-secondary'}`}></div>
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-primary"></div>

        {/* Modal Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${
                isExpired
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 ring-2 ring-rose-500/30'
                  : 'bg-primary/20 text-primary border-primary/40'
              }`}
            >
              {member.avatarInitials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`font-sora text-base font-semibold ${isExpired ? 'text-rose-200' : 'text-on-surface'}`}>
                  {member.name}
                </h3>
                {isExpired && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">fingerprint_off</span>
                    <span>Expired · Bio Locked</span>
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                  isExpired
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-primary/20 text-primary border-primary/40'
                }`}>{member.planDuration}</span>
                {member.timingSlot && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    member.timingSlot === 'MORNING'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-400/40'
                      : member.timingSlot === 'EVENING'
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-400/40'
                      : 'bg-primary/20 text-primary border-primary/40'
                  }`}>
                    {member.timingSlot === 'MORNING' ? '🌅 Morning' : member.timingSlot === 'EVENING' ? '🌇 Evening' : '⚡ Flexible'}
                  </span>
                )}
              </div>
              <p className="text-xs text-outline">
                {member.email} · {member.phone}
                {member.dobFormatted && (
                  <span> · <span className="text-secondary font-medium">🎂 DOB: {member.dobFormatted}{typeof member.age === 'number' ? ` (${member.age} yrs)` : ''}</span></span>
                )}
              </p>
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
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-on-surface">

          {/* Expired Membership Biometric Rejection Alert Banner */}
          {isExpired && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/50 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-rose-400">fingerprint_off</span>
                <div>
                  <p className="font-sora font-bold text-rose-300">
                    Membership Expired ({Math.abs(member.daysLeft)} days overdue) · Biometric Turnstile Locked
                  </p>
                  <p className="text-[11px] text-rose-200/80">
                    Biometric fingerprint/face recognition &amp; turnstile gates will automatically reject this member until renewed.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRenewDueBox(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-sm"
              >
                Renew Now
              </button>
            </div>
          )}

          {/* Pending Due Alert Banner */}
          {member.pendingDue && member.pendingDue > 0 ? (
            <div className="p-3.5 rounded-xl bg-error/15 border border-error/40 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-error">pending_actions</span>
                <div>
                  <p className="font-sora font-bold text-error">
                    ₹{member.pendingDue.toLocaleString('en-IN')} Fee Due Pending
                  </p>
                  <p className="text-[11px] text-outline">
                    Member has outstanding admission/renewal dues to be cleared
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-error text-white font-bold text-xs">
                Pending Due
              </span>
            </div>
          ) : null}

          {/* Birthday celebratory banner if today is member's birthday */}
          {member.isBirthdayToday && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-tertiary/20 border border-secondary/50 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl animate-bounce">🎂</span>
                <div>
                  <p className="font-sora text-xs font-bold text-on-surface">
                    It's {member.name}'s Birthday Today!
                  </p>
                  <p className="text-[11px] text-outline">
                    Send warm birthday wishes directly from your gym.
                  </p>
                </div>
              </div>
              {onWishBirthday && (
                <button
                  type="button"
                  onClick={() => onWishBirthday(member)}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-[#001f28] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:opacity-90 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">cake</span>
                  <span>Wish Birthday</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3 rounded-lg border ${
              isExpired
                ? 'bg-rose-950/20 border-rose-500/40'
                : 'bg-surface-container-lowest border-surface-container-high'
            }`}>
              <span className="text-xs text-outline uppercase font-bold">
                Time Remaining
              </span>
              <p
                className={`text-base font-sora font-bold mt-1 ${
                  isExpired ? 'text-rose-400' : member.daysLeft <= 3 ? 'text-error' : 'text-secondary'
                }`}
              >
                {isExpired ? `Expired (${Math.abs(member.daysLeft)}d ago)` : `${member.daysLeft} Days`}
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
              <span className="text-xs text-outline uppercase font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-secondary">schedule</span>
                <span>Slot</span>
              </span>
              <p className="text-xs font-bold mt-1.5 text-on-surface truncate">
                {member.timingSlot === 'MORNING'
                  ? '🌅 Morning'
                  : member.timingSlot === 'EVENING'
                  ? '🌇 Evening'
                  : '⚡ Flexible'}
              </p>
              <span className="text-xs text-outline">
                {member.timingSlot === 'MORNING' ? '6 AM - 11 AM' : member.timingSlot === 'EVENING' ? '5 PM - 10 PM' : 'All day'}
              </span>
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

          {/* Fitness & BMI Card */}
          <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#4edea3]">monitor_weight</span>
                <span className="text-xs font-bold uppercase tracking-wider text-outline">
                  Fitness &amp; BMI Metrics
                </span>
              </div>
              {member.bmi ? (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  member.bmi < 18.5
                    ? 'bg-sky-500/10 text-sky-400 border-sky-400/30'
                    : member.bmi < 25
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30'
                    : member.bmi < 30
                    ? 'bg-amber-500/10 text-amber-400 border-amber-400/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-400/30'
                }`}>
                  BMI {member.bmi} · {member.bmiCategory || 'Recorded'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onEdit(member)}
                  className="text-[11px] font-bold text-secondary hover:underline cursor-pointer"
                >
                  + Add Weight/Height
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg bg-surface-container-lowest border border-surface-container-high">
                <span className="text-[10px] text-outline uppercase font-semibold">Weight</span>
                <p className="font-sora font-bold text-on-surface text-xs mt-0.5">
                  {member.weight ? `${member.weight} kg` : '—'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest border border-surface-container-high">
                <span className="text-[10px] text-outline uppercase font-semibold">Height</span>
                <p className="font-sora font-bold text-on-surface text-xs mt-0.5">
                  {member.height ? `${member.height} cm` : '—'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest border border-surface-container-high">
                <span className="text-[10px] text-outline uppercase font-semibold">BMI Score</span>
                <p className="font-sora font-bold text-xs mt-0.5 text-[#4edea3]">
                  {member.bmi ? member.bmi : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Plan Info & Renewal Section */}
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
              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                {onExtendMembership && (
                  <button
                    onClick={() => {
                      setShowExtendBox(!showExtendBox);
                      setShowRenewDueBox(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-on-surface font-bold text-xs transition-all border border-secondary/30 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">pause_circle</span>
                    <span>{showExtendBox ? 'Close' : 'Freeze / Extend'}</span>
                  </button>
                )}

                {onRenewWithDue && (
                  <button
                    onClick={() => {
                      setShowRenewDueBox(!showRenewDueBox);
                      setShowExtendBox(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-amber-300 hover:text-white font-bold text-xs transition-all border border-amber-400/40 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">pending_actions</span>
                    <span>{showRenewDueBox ? 'Close' : 'Renew with Due / Custom Days'}</span>
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
                  {renewBusy ? 'Renewing...' : `Quick Renew`}
                </button>
              </div>
            </div>

            {/* Collapsible Renew with Due / Custom Days Panel */}
            {showRenewDueBox && (
              <div className="pt-3 border-t border-surface-container-high/60 space-y-3 bg-surface-container-lowest/80 p-3.5 rounded-xl border border-amber-400/30 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">price_change</span>
                    <span>Renew with Custom Days &amp; Partial / Due Fee</span>
                  </span>
                  <span className="text-[11px] text-outline">
                    Current Expiry: <b className="text-on-surface">{member.expiryDate}</b>
                  </span>
                </div>

                {/* Renewal Days Presets */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-outline">Renewal Validity Days:</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[7, 15, 30, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setRenewDueDays(d);
                          setRenewCustomDays('');
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                          !renewCustomDays && renewDueDays === d
                            ? 'bg-amber-400 text-[#001f28] font-bold'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-xs text-outline">Custom:</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={renewCustomDays}
                        onChange={(e) => setRenewCustomDays(e.target.value)}
                        placeholder="Days"
                        className="w-16 bg-surface-container px-2 py-1 rounded text-xs text-on-surface border border-surface-container-high focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Discount & Partial Payment Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-outline block mb-1">Custom Discount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 200"
                      value={renewDiscount}
                      onChange={(e) => setRenewDiscount(e.target.value)}
                      className="w-full bg-surface-container border border-surface-container-high rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-outline">Partial Payment</label>
                      <button
                        type="button"
                        onClick={() => setRenewIsPartial(!renewIsPartial)}
                        className={`text-[10px] font-bold cursor-pointer ${renewIsPartial ? 'text-error underline' : 'text-secondary hover:underline'}`}
                      >
                        {renewIsPartial ? 'Enabled' : '+ Enable Partial'}
                      </button>
                    </div>
                    {renewIsPartial ? (
                      <input
                        type="number"
                        placeholder="Amount paid now (₹)"
                        value={renewPaidNow}
                        onChange={(e) => setRenewPaidNow(e.target.value)}
                        className="w-full bg-surface-container border border-error/50 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-error"
                      />
                    ) : (
                      <div className="text-[11px] text-outline py-1.5">Full fee payment on renewal</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-surface-container-high/60">
                  <button
                    type="button"
                    onClick={handleRenewWithDueSubmit}
                    disabled={renewDueBusy}
                    className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#001f28] font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {renewDueBusy && (
                      <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                    )}
                    <span>{renewDueBusy ? 'Renewing...' : `Confirm Renewal`}</span>
                  </button>
                </div>
              </div>
            )}

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
          {/* Member app login */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">Member app login</span>
              <div className="flex items-center gap-2">
                {hasLogin && (
                  <button
                    onClick={handleRevokeLogin}
                    disabled={revokeBusy}
                    className="text-xs text-error hover:underline font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    title="Remove member's app login access if they left the gym"
                  >
                    {revokeBusy ? 'Removing...' : 'Remove Login Access'}
                  </button>
                )}
                <button
                  onClick={handleLogin}
                  disabled={busy}
                  className="text-xs text-secondary hover:underline font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {busy && (
                    <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                  )}
                  {busy ? 'Please wait...' : hasLogin ? 'Resend Pass Details' : 'Share Pass Access'}
                </button>
              </div>
            </div>
            {created ? (
              <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-xs space-y-1.5">
                <p className="text-on-surface">
                  Gym code: <b>{created.gymCode}</b> · Member ID (Phone): <b>{created.memberCode}</b>
                </p>
                <p className="text-tertiary font-medium">
                  ✓ Passwordless login enabled. Member can access their pass directly using Gym Code &amp; Phone Number.
                </p>
                <button
                  onClick={() => sendLoginOnWhatsApp(created)}
                  className="font-bold text-tertiary hover:underline cursor-pointer flex items-center gap-1 pt-1"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  <span>Share Pass Link on WhatsApp</span>
                </button>
              </div>
            ) : failure ? (
              <p className="text-xs text-error">{failure}</p>
            ) : (
              <p className="text-xs text-outline">
                {hasLogin ? 'Member has active digital pass access (No password required).' : 'Pass access not shared yet.'}
              </p>
            )}
          </div>

          {/* Recent check-ins (Mark Present removed) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">
                Recent Check-ins
              </span>
              <span className="text-[11px] text-outline font-semibold">
                Biometric &amp; QR logs
              </span>
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
        <div className="px-6 py-3.5 bg-surface-container-lowest border-t border-surface-container-high flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsAppLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold transition-all border border-[#25D366]/30 cursor-pointer shadow-xs active:scale-95"
              title="1-Click automatic WhatsApp reminder"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              <span>{copied ? 'WhatsApp Opened!' : 'Remind'}</span>
            </button>

            {onWishBirthday && member.isBirthdayToday && (
              <button
                onClick={() => onWishBirthday(member)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-[#001f28] hover:bg-secondary/90 text-xs font-bold transition-all border border-secondary cursor-pointer shadow-xs active:scale-95 animate-pulse"
                title="Wish Happy Birthday Today!"
              >
                <span className="material-symbols-outlined text-base">cake</span>
                <span>Wish Birthday 🎂</span>
              </button>
            )}
          </div>

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
