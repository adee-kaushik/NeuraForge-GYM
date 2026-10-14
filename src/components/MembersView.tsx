'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Member, MembershipPlan, CheckInLog } from '../types';
import { formatTimestamp, formatTime, isSameDay } from '../lib/format';
import type { ScanCheckInResult } from '@/actions/attendance';

interface MembersViewProps {
  members: Member[];
  plans?: MembershipPlan[];
  checkIns?: CheckInLog[];
  todayCheckInsCount?: number;
  onSelectMember: (member: Member) => void;
  onOpenAddMember: () => void;
  onOpenImport: () => void;
  onOpenBulkWhatsApp: () => void;
  onSendSingleReminder: (member: Member) => void;
  onWishBirthday?: (member: Member) => void;
  initialFilter?: 'all' | 'expiring';
  gymSlug?: string;
  onCheckInByCode?: (code: string) => Promise<ScanCheckInResult>;
}

type ExpiryFilterType = 'all' | '7days' | '1month' | '3months' | 'expired';
type PaymentFilterType = 'all' | 'advance' | 'pending' | 'advance1m' | 'advance3m';
type BirthdayFilterType = 'all' | 'today' | 'upcoming';
type AttendanceTimeframe = 'today' | 'week' | 'month';

interface ScanFeedback {
  status: 'GRANTED' | 'DENIED' | 'ALREADY_PRESENT';
  name: string;
  memberCode: string;
  planName?: string;
  daysLeft?: number;
  message?: string;
  timestamp: string;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  plans = [],
  checkIns = [],
  todayCheckInsCount,
  onSelectMember,
  onOpenAddMember,
  onOpenImport,
  onOpenBulkWhatsApp,
  onSendSingleReminder,
  onWishBirthday,
  initialFilter = 'all',
  gymSlug = '',
  onCheckInByCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expiring' | 'Expired'>(
    initialFilter === 'expiring' ? 'Expiring' : 'All'
  );
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilterType>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>('all');
  const [birthdayFilter, setBirthdayFilter] = useState<BirthdayFilterType>('all');
  const [timingFilter, setTimingFilter] = useState<'all' | 'MORNING' | 'EVENING'>('all');

  // Attendance section state
  const [attendanceTimeframe, setAttendanceTimeframe] = useState<AttendanceTimeframe>('today');
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Biometric Hub state
  const [showBiometricsHub, setShowBiometricsHub] = useState(false);
  const [deviceGuideTab, setDeviceGuideTab] = useState<'essl' | 'lan' | 'json'>('essl');
  const [bioId, setBioId] = useState('');
  const [bioBusy, setBioBusy] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const attendanceSectionRef = useRef<HTMLDivElement | null>(null);

  // Group / build distinct plans list
  const availablePlans = useMemo(() => {
    if (plans && plans.length > 0) {
      return plans;
    }
    // Fallback: derive from members
    const planNames = Array.from(new Set(members.map((m) => m.planName).filter(Boolean)));
    return planNames.map((name) => ({
      id: name,
      name,
      durationLabel: name,
      durationMonths: 1,
      price: 0,
      features: [],
      popular: false,
    }));
  }, [plans, members]);

  // Count members per plan
  const planMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of members) {
      counts[m.planName] = (counts[m.planName] || 0) + 1;
    }
    return counts;
  }, [members]);

  // Filtering members table
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.memberCode && m.memberCode.toLowerCase().includes(q));

      // 2. Plan filter (from plan cards or dropdown)
      const matchesPlan = selectedPlan === 'All' || m.planName === selectedPlan || m.planDuration === selectedPlan;

      // 3. Status filter
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Expiring' && m.status === 'expiring') ||
        (statusFilter === 'Expired' && m.status === 'expired') ||
        (statusFilter === 'Active' && m.status === 'active');

      // 4. Expiry Multi-filters (7 days, 1 month, 3 months, expired)
      let matchesExpiry = true;
      if (expiryFilter === '7days') {
        matchesExpiry = m.daysLeft >= 0 && m.daysLeft <= 7;
      } else if (expiryFilter === '1month') {
        matchesExpiry = m.daysLeft >= 0 && m.daysLeft <= 30;
      } else if (expiryFilter === '3months') {
        matchesExpiry = m.daysLeft >= 0 && m.daysLeft <= 90;
      } else if (expiryFilter === 'expired') {
        matchesExpiry = m.daysLeft < 0;
      }

      // 5. Advance Payments Multi-filters
      let matchesPayment = true;
      const hasDues = typeof m.pendingDue === 'number' && m.pendingDue > 0;
      if (paymentFilter === 'advance') {
        matchesPayment = !hasDues && m.daysLeft > 0;
      } else if (paymentFilter === 'pending') {
        matchesPayment = hasDues;
      } else if (paymentFilter === 'advance1m') {
        matchesPayment = !hasDues && m.daysLeft >= 30;
      } else if (paymentFilter === 'advance3m') {
        matchesPayment = !hasDues && m.daysLeft >= 90;
      }

      // 6. Birthday Multi-filters
      let matchesBirthday = true;
      if (birthdayFilter === 'today') {
        matchesBirthday = !!m.isBirthdayToday;
      } else if (birthdayFilter === 'upcoming') {
        matchesBirthday = typeof m.daysUntilBirthday === 'number' && m.daysUntilBirthday <= 7;
      }

      // 7. Timing Slot Filter (Morning / Evening slot)
      const matchesTiming =
        timingFilter === 'all' ||
        (timingFilter === 'MORNING' && (m.timingSlot === 'MORNING' || m.timingSlot === 'BOTH')) ||
        (timingFilter === 'EVENING' && (m.timingSlot === 'EVENING' || m.timingSlot === 'BOTH'));

      return matchesSearch && matchesPlan && matchesStatus && matchesExpiry && matchesPayment && matchesBirthday && matchesTiming;
    });
  }, [members, searchQuery, selectedPlan, statusFilter, expiryFilter, paymentFilter, birthdayFilter, timingFilter]);

  // Birthday lists for greetings & banner
  const birthdayMembersToday = useMemo(
    () => members.filter((m) => m.isBirthdayToday),
    [members]
  );
  const upcomingBirthdays = useMemo(
    () => members.filter((m) => !m.isBirthdayToday && typeof m.daysUntilBirthday === 'number' && m.daysUntilBirthday <= 7),
    [members]
  );

  // Filtered check-ins for "Here Today" section
  const now = useMemo(() => new Date(), []);

  const { filteredCheckIns, timeframeCounts } = useMemo(() => {
    const todayList = checkIns.filter((c) => isSameDay(c.checkedInAt, now));

    const weekList = checkIns.filter((c) => {
      const diffMs = now.getTime() - new Date(c.checkedInAt).getTime();
      return diffMs >= 0 && diffMs <= 7 * 86400000;
    });

    const monthList = checkIns.filter((c) => {
      const diffMs = now.getTime() - new Date(c.checkedInAt).getTime();
      return diffMs >= 0 && diffMs <= 30 * 86400000;
    });

    let currentList = todayList;
    if (attendanceTimeframe === 'week') currentList = weekList;
    if (attendanceTimeframe === 'month') currentList = monthList;

    if (attendanceSearch.trim()) {
      const q = attendanceSearch.toLowerCase().trim();
      currentList = currentList.filter(
        (c) =>
          c.memberName.toLowerCase().includes(q) ||
          c.planDuration.toLowerCase().includes(q) ||
          (c.time && c.time.toLowerCase().includes(q))
      );
    }

    return {
      filteredCheckIns: currentList,
      timeframeCounts: {
        today: todayList.length,
        week: weekList.length,
        month: monthList.length,
      },
    };
  }, [checkIns, attendanceTimeframe, attendanceSearch, now]);

  // Biometric Test Punch simulator
  const handleBiometricPunch = async (codeToTest: string) => {
    const trimmed = codeToTest.trim();
    if (!trimmed || !onCheckInByCode) return;

    setBioBusy(true);
    const res = await onCheckInByCode(trimmed);
    setBioBusy(false);

    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if ('error' in res) {
      const isAlready = res.error.toLowerCase().includes('already marked');
      setFeedback({
        status: isAlready ? 'ALREADY_PRESENT' : 'DENIED',
        name: res.memberName || trimmed,
        memberCode: trimmed,
        message: res.error,
        timestamp: nowTime,
      });
    } else {
      setFeedback({
        status: 'GRANTED',
        name: res.member.name,
        memberCode: res.member.memberCode,
        planName: res.member.planName,
        daysLeft: res.member.daysLeft,
        message: 'Floor access granted. Biometric punch recorded.',
        timestamp: nowTime,
      });
      setBioId('');
    }
  };

  const copyGymSlug = () => {
    if (!gymSlug) return;
    navigator.clipboard.writeText(gymSlug);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const copyAdmsPath = () => {
    navigator.clipboard.writeText('/iclock/cdata');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const scrollToAttendance = () => {
    attendanceSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">groups</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Members &amp; Floor Check-ins</h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Manage member roster, gym plans, expiry alerts, advance payments, and check-in activity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowBiometricsHub(!showBiometricsHub)}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showBiometricsHub
                ? 'bg-secondary text-[#001f28] border-secondary'
                : 'bg-surface-container hover:bg-surface-container-high text-secondary border-secondary/30'
            }`}
          >
            <span className="material-symbols-outlined text-base sm:text-lg">fingerprint</span>
            <span>{showBiometricsHub ? 'Close Biometrics' : 'Biometrics Hub'}</span>
          </button>

          <button
            onClick={onOpenImport}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs sm:text-sm font-bold border border-surface-container-high transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">upload_file</span>
            <span>Import</span>
          </button>

          <button
            onClick={onOpenBulkWhatsApp}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#15803d] text-xs sm:text-sm font-bold border border-[#25D366]/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">chat</span>
            <span>Send Reminders</span>
          </button>

          <button
            onClick={onOpenAddMember}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold transition-all shadow-sm hover:opacity-90 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">person_add</span>
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* BIOMETRICS HARDWARE HUB (Relocated from Attendance) */}
      {showBiometricsHub && (
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-secondary/40 shadow-[0_0_30px_rgba(123,208,255,0.15)] flex flex-col gap-4 animate-in fade-in slide-in-from-top-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-container-high">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
              <div>
                <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                  Biometric Device Sync &amp; Cloud Push Hub
                </h3>
                <p className="text-xs text-outline">
                  Automated turnstile &amp; biometric attendance (eSSL, ZKTeco, Mantra)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-surface-container text-[11px] font-mono text-secondary border border-surface-container-high">
                Slug: <strong>{gymSlug || 'default'}</strong>
              </span>
              <button
                type="button"
                onClick={copyGymSlug}
                className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                {copiedSlug ? 'Copied!' : 'Copy Slug'}
              </button>
              <button
                type="button"
                onClick={copyAdmsPath}
                className="px-2.5 py-1 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-xs font-bold text-secondary transition-colors cursor-pointer"
              >
                {copiedUrl ? 'Copied ADMS!' : 'Copy ADMS Path'}
              </button>
            </div>
          </div>

          {/* Biometric Simulator & Setup Guides */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Live Punch Simulator */}
            <div className="lg:col-span-5 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-secondary">fingerprint</span>
                  <span>Test Biometric Punch</span>
                </span>
                <p className="text-[11px] text-outline mt-1">
                  Test physical punch reception or manually trigger attendance verification.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={bioId}
                  onChange={(e) => setBioId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBiometricPunch(bioId)}
                  placeholder="Enter Member Code (e.g. MEM-001)"
                  className="flex-1 bg-surface-container px-3 py-2 rounded-xl text-xs font-mono text-on-surface border border-surface-container-high focus:border-secondary focus:outline-none"
                />
                <button
                  onClick={() => handleBiometricPunch(bioId)}
                  disabled={bioBusy || !bioId.trim()}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
                >
                  {bioBusy && <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>}
                  <span>Test Punch</span>
                </button>
              </div>

              {/* Quick Member Punch Chips */}
              <div className="pt-2 border-t border-surface-container-high">
                <span className="text-[11px] text-outline block mb-1.5">Quick punch active member:</span>
                <div className="flex flex-wrap gap-1.5">
                  {members.slice(0, 6).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleBiometricPunch(m.memberCode)}
                      className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-mono text-secondary border border-surface-container-high cursor-pointer transition-colors"
                    >
                      {m.memberCode} ({m.name.split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hardware Guide Tabs */}
            <div className="lg:col-span-7 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
                <span className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-secondary">settings_ethernet</span>
                  <span>Machine Configuration</span>
                </span>

                <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDeviceGuideTab('essl')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      deviceGuideTab === 'essl'
                        ? 'bg-surface-container-lowest text-secondary shadow-xs'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    eSSL / ZKTeco Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceGuideTab('lan')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      deviceGuideTab === 'lan'
                        ? 'bg-surface-container-lowest text-secondary shadow-xs'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    LAN Bridge
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceGuideTab('json')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      deviceGuideTab === 'json'
                        ? 'bg-surface-container-lowest text-secondary shadow-xs'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    API / Mantra
                  </button>
                </div>
              </div>

              {deviceGuideTab === 'essl' && (
                <div className="space-y-2 text-xs">
                  <p className="text-on-surface-variant text-[11px]">
                    <strong>Direct Cloud Push (Zero PC Required):</strong> Enter these settings on your eSSL / ZKTeco machine screen:
                  </p>
                  <div className="p-2.5 bg-surface-container rounded-xl font-mono text-[11px] space-y-1.5 border border-surface-container-high">
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Server Address:</span>
                      <span className="text-secondary font-bold select-all">
                        {typeof window !== 'undefined' ? window.location.host : 'neurafitness.com'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Server Port:</span>
                      <span className="text-secondary font-bold">443 (HTTPS) or 80 (HTTP)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-outline">ADMS / iClock Path:</span>
                      <span className="text-tertiary font-bold">/iclock/cdata</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-outline">
                    Menu → Comm. → Cloud Server / ADMS → Enable Domain Name ON → Save.
                  </p>
                </div>
              )}

              {deviceGuideTab === 'lan' && (
                <div className="space-y-2 text-xs">
                  <p className="text-on-surface-variant text-[11px]">
                    <strong>Local LAN Bridge:</strong> For offline WiFi/Ethernet devices on port 4370:
                  </p>
                  <code className="text-secondary block p-2 bg-surface-container rounded text-[11px] font-mono border border-surface-container-high select-all">
                    node public/scripts/neurafitness-sync.js
                  </code>
                  <a
                    href="/scripts/neurafitness-sync.js"
                    download="neurafitness-sync.js"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high text-secondary text-xs font-bold hover:bg-surface-container-highest transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Download Desktop Script</span>
                  </a>
                </div>
              )}

              {deviceGuideTab === 'json' && (
                <div className="space-y-2 text-xs">
                  <p className="text-on-surface-variant text-[11px]">
                    <strong>REST Endpoint:</strong> POST /api/attendance/biometric
                  </p>
                  <pre className="p-2 bg-surface-container rounded text-[10px] font-mono text-tertiary overflow-x-auto border border-surface-container-high">
{`{
  "gymSlug": "${gymSlug || 'your-gym-slug'}",
  "identifier": "MEM-001",
  "timestamp": "${new Date().toISOString()}"
}`}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in ${
                feedback.status === 'GRANTED'
                  ? 'bg-tertiary/10 border-tertiary text-tertiary'
                  : feedback.status === 'ALREADY_PRESENT'
                  ? 'bg-secondary/10 border-secondary text-secondary'
                  : 'bg-error/10 border-error text-error'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  {feedback.status === 'GRANTED' ? 'check_circle' : feedback.status === 'ALREADY_PRESENT' ? 'verified' : 'cancel'}
                </span>
                <span className="font-bold">{feedback.name} ({feedback.memberCode}):</span>
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-outline hover:text-on-surface p-1">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TODAY'S BIRTHDAYS CELEBRATION BANNER */}
      {birthdayMembersToday.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/15 via-secondary/15 to-[#25D366]/15 border border-secondary/40 shadow-[0_0_35px_rgba(123,208,255,0.18)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-[#001f28] flex items-center justify-center font-bold text-2xl shadow-sm shrink-0 animate-bounce">
              🎂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                  {birthdayMembersToday.length === 1
                    ? `Today is ${birthdayMembersToday[0].name}'s Birthday!`
                    : `${birthdayMembersToday.length} Members Celebrate Birthdays Today!`}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 uppercase tracking-wider">
                  Birthday Alert
                </span>
              </div>
              <p className="text-xs text-outline mt-0.5">
                Send personalized warm birthday wishes directly via WhatsApp and to their Member Digital Pass!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {birthdayMembersToday.map((bm) => (
              <button
                key={bm.id}
                onClick={() => (onWishBirthday ? onWishBirthday(bm) : onSelectMember(bm))}
                className="px-3.5 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-secondary/40 hover:border-secondary text-xs font-bold text-on-surface flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                title={`Send Birthday Wish to ${bm.name}`}
              >
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">
                  {bm.avatarInitials}
                </span>
                <span>{bm.name}</span>
                <span className="text-secondary text-xs font-bold flex items-center gap-1 bg-secondary/15 px-1.5 py-0.5 rounded">
                  <span className="material-symbols-outlined text-xs">cake</span>
                  <span>Wish</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SUMMARY CARDS: Total Members, Split Gym Plans, Expiring, Here Today */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Members */}
        <div
          onClick={() => {
            setSelectedPlan('All');
            setExpiryFilter('all');
            setPaymentFilter('all');
            setStatusFilter('All');
          }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            selectedPlan === 'All' && expiryFilter === 'all' && paymentFilter === 'all' && statusFilter === 'All'
              ? 'bg-surface-container border-secondary/60 shadow-[0_0_15px_rgba(123,208,255,0.2)]'
              : 'bg-surface-container-low border-surface-container-high hover:bg-surface-container/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline">Total Members</span>
            <span className="material-symbols-outlined text-secondary text-xl">groups</span>
          </div>
          <p className="font-sora text-2xl font-bold text-on-surface mt-1">{members.length}</p>
          <span className="text-[10px] text-outline mt-0.5 block">Click to view all</span>
        </div>

        {/* Dynamic Split Gym Plans Cards (Requirement 3) */}
        {availablePlans.map((plan) => {
          const count = planMemberCounts[plan.name] || 0;
          const isSelected = selectedPlan === plan.name;
          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(isSelected ? 'All' : plan.name)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-surface-container border-primary shadow-[0_0_20px_rgba(148,125,255,0.35)]'
                  : 'bg-surface-container-low border-surface-container-high hover:bg-surface-container/60'
              }`}
              title={`Click to show members availing ${plan.name}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary truncate max-w-[90px]">
                  {plan.name}
                </span>
                <span className="material-symbols-outlined text-primary text-xl">card_membership</span>
              </div>
              <p className="font-sora text-2xl font-bold text-on-surface mt-1">{count}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-outline">{plan.durationLabel || `${plan.durationMonths || 1} mo`}</span>
                {isSelected && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary text-on-primary">ACTIVE</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Expiring This Week */}
        <div
          onClick={() => {
            setExpiryFilter('7days');
            setStatusFilter('Expiring');
          }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            expiryFilter === '7days' || statusFilter === 'Expiring'
              ? 'bg-error/10 border-error shadow-[0_0_15px_rgba(255,180,171,0.25)]'
              : 'bg-surface-container-low border-surface-container-high hover:bg-surface-container/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-error">Expiring Soon</span>
            <span className="material-symbols-outlined text-error text-xl">warning</span>
          </div>
          <p className="font-sora text-2xl font-bold text-error mt-1">
            {members.filter((m) => m.daysLeft >= 0 && m.daysLeft <= 7).length}
          </p>
          <span className="text-[10px] text-outline mt-0.5 block">Next 7 days</span>
        </div>

        {/* Here Today (Requirement 7: Clicks to jump to Check-in activity) */}
        <div
          onClick={scrollToAttendance}
          className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high hover:bg-tertiary/10 hover:border-tertiary/40 cursor-pointer transition-all"
          title="Click to view today's check-ins with member plans"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">Here Today</span>
            <span className="material-symbols-outlined text-tertiary text-xl">verified_user</span>
          </div>
          <p className="font-sora text-2xl font-bold text-tertiary mt-1">
            {todayCheckInsCount ?? timeframeCounts.today}
          </p>
          <span className="text-[10px] text-tertiary font-bold mt-0.5 block flex items-center gap-1">
            <span>View check-ins</span>
            <span className="material-symbols-outlined text-xs">arrow_downward</span>
          </span>
        </div>
      </div>

      {/* MULTI-FILTERS BAR (Requirement 2: Expiry & Advance Payments Filters) */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-3">
        {/* Top search & Plan selection */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, code or email"
              className="w-full bg-surface-container-lowest pl-9 pr-3 py-2 rounded-lg text-xs text-on-surface border border-surface-container-high focus:border-secondary focus:outline-none"
            />
          </div>

          {/* Active plan chip indicator */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-outline font-bold uppercase mr-1">Plan:</span>
            <button
              onClick={() => setSelectedPlan('All')}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedPlan === 'All'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
              }`}
            >
              All Plans ({members.length})
            </button>
            {availablePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.name)}
                className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedPlan === plan.name
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
                }`}
              >
                {plan.name} ({planMemberCounts[plan.name] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Second Row: Expiry Filters & Advance Payment Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-container-high">
          {/* Expiry Multi-filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-outline font-bold uppercase flex items-center gap-1 mr-1">
              <span className="material-symbols-outlined text-sm text-error">event</span>
              <span>Expiry:</span>
            </span>
            {[
              { id: 'all' as ExpiryFilterType, label: 'All' },
              { id: '7days' as ExpiryFilterType, label: '7 Days' },
              { id: '1month' as ExpiryFilterType, label: '1 Month' },
              { id: '3months' as ExpiryFilterType, label: '3 Months' },
              { id: 'expired' as ExpiryFilterType, label: 'Expired' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setExpiryFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  expiryFilter === f.id
                    ? 'bg-error text-[#410002] font-bold shadow-xs'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Advance Payments Multi-filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-outline font-bold uppercase flex items-center gap-1 mr-1">
              <span className="material-symbols-outlined text-sm text-secondary">payments</span>
              <span>Payment:</span>
            </span>
            {[
              { id: 'all' as PaymentFilterType, label: 'All' },
              { id: 'advance' as PaymentFilterType, label: 'Paid in Advance' },
              { id: 'pending' as PaymentFilterType, label: 'Pending Dues' },
              { id: 'advance1m' as PaymentFilterType, label: 'Advance > 1 Mo' },
              { id: 'advance3m' as PaymentFilterType, label: 'Advance > 3 Mo' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setPaymentFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  paymentFilter === f.id
                    ? 'bg-secondary text-[#001f28] font-bold shadow-xs'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Birthday Multi-filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-outline font-bold uppercase flex items-center gap-1 mr-1">
              <span className="material-symbols-outlined text-sm text-secondary">cake</span>
              <span>Birthdays:</span>
            </span>
            {[
              { id: 'all' as BirthdayFilterType, label: 'All' },
              { id: 'today' as BirthdayFilterType, label: `Today (${birthdayMembersToday.length})` },
              { id: 'upcoming' as BirthdayFilterType, label: `Next 7 Days (${upcomingBirthdays.length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setBirthdayFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  birthdayFilter === f.id
                    ? 'bg-secondary text-[#001f28] font-bold shadow-xs'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Timing Slot Filter (Morning / Evening slot) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-outline font-bold uppercase flex items-center gap-1 mr-1">
              <span className="material-symbols-outlined text-sm text-amber-300">schedule</span>
              <span>Timings:</span>
            </span>
            {[
              { id: 'all' as const, label: 'All Slots' },
              { id: 'MORNING' as const, label: '🌅 Morning Slot' },
              { id: 'EVENING' as const, label: '🌇 Evening Slot' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTimingFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timingFilter === f.id
                    ? 'bg-amber-400 text-[#001f28] font-bold shadow-xs'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MEMBERS TABLE */}
      <div className="rounded-xl bg-surface-container-low border border-surface-container-high overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <div className="overflow-x-auto">
          <table className="stack w-full text-left text-on-surface text-xs">
            <thead>
              <tr className="text-outline uppercase text-xs bg-surface-container-lowest border-b border-surface-container-high">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-3">Plan &amp; Slot</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Payment / Due</th>
                <th className="py-3 px-3">Visits This Month</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => onSelectMember(member)}
                  className="hover:bg-surface-container/70 transition-colors group cursor-pointer"
                >
                  <td data-label="Member" className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                        {member.avatarInitials}
                      </div>
                      <div>
                        <div className="font-semibold text-on-surface group-hover:text-secondary transition-colors flex items-center gap-1.5 flex-wrap">
                          <span>{member.name}</span>
                          {member.isBirthdayToday ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-secondary/20 text-secondary border border-secondary/40 inline-flex items-center gap-0.5 animate-pulse">
                              🎂 Birthday Today!
                            </span>
                          ) : typeof member.daysUntilBirthday === 'number' && member.daysUntilBirthday <= 7 ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary/20 text-primary border border-primary/40 inline-flex items-center gap-0.5">
                              🎂 in {member.daysUntilBirthday}d
                            </span>
                          ) : null}
                          {member.bmi && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-surface-container-high text-[#4edea3] border border-[#4edea3]/30 inline-flex items-center">
                              BMI {member.bmi}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-outline flex items-center gap-1.5 flex-wrap">
                          <span>{member.phone}</span>
                          {member.memberCode && (
                            <span className="font-mono text-[10px] text-secondary">({member.memberCode})</span>
                          )}
                          {member.dobFormatted && (
                            <span className="text-[10px] text-outline font-medium">· DOB: {member.dobFormatted}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Plan &amp; Slot" className="py-3.5 px-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/15 text-primary border border-primary/30">
                        {member.planName}
                      </span>
                      {member.timingSlot && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                          member.timingSlot === 'MORNING'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-400/30'
                            : member.timingSlot === 'EVENING'
                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-400/30'
                            : 'bg-primary/10 text-primary border-primary/30'
                        }`}>
                          {member.timingSlot === 'MORNING' ? '🌅 Morning' : member.timingSlot === 'EVENING' ? '🌇 Evening' : '⚡ Flexible'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label="Expiry Date" className="py-3.5 px-3 text-on-surface-variant font-mono">
                    {member.expiryDate}
                  </td>
                  <td data-label="Status" className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        member.daysLeft < 0
                          ? 'bg-error/20 text-error border border-error/40'
                          : member.daysLeft <= 3
                          ? 'bg-error-container/50 text-error border border-error/30'
                          : member.daysLeft <= 7
                          ? 'bg-secondary-container/20 text-secondary'
                          : 'bg-tertiary-container/20 text-tertiary'
                      }`}
                    >
                      {member.daysLeft < 0 ? `Expired ${Math.abs(member.daysLeft)}d ago` : `${member.daysLeft} days left`}
                    </span>
                  </td>
                  <td data-label="Payment / Due" className="py-3.5 px-3">
                    {member.pendingDue && member.pendingDue > 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-error/15 text-error border border-error/30">
                        ₹{member.pendingDue.toLocaleString('en-IN')} Due
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-tertiary/15 text-tertiary border border-tertiary/30">
                        Paid Full
                      </span>
                    )}
                  </td>
                  <td data-label="Visits This Month" className="py-3.5 px-3 text-on-surface">
                    <span className="font-semibold">{member.attendanceCountThisMonth}</span> visits
                  </td>
                  <td data-label="" className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {/* Birthday Wish Button - Only for members celebrating today */}
                      {onWishBirthday && member.isBirthdayToday && (
                        <button
                          onClick={() => onWishBirthday(member)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer shadow-xs active:scale-95 bg-secondary text-[#001f28] hover:bg-secondary/90 border-secondary animate-pulse"
                          title="Wish Happy Birthday Today!"
                        >
                          <span className="material-symbols-outlined text-sm">cake</span>
                          <span>Wish 🎂</span>
                        </button>
                      )}

                      {/* 1-Click WhatsApp Reminder button (Requirement 4) */}
                      <button
                        onClick={() => onSendSingleReminder(member)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold transition-all border border-[#25D366]/30 cursor-pointer shadow-xs active:scale-95"
                        title="1-Click automatic WhatsApp reminder"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span>Remind</span>
                      </button>

                      <button
                        onClick={() => onSelectMember(member)}
                        className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high cursor-pointer"
                        title="View details"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="text-xs text-outline max-w-sm mx-auto">
                      <span className="material-symbols-outlined text-3xl block mb-2 text-outline/50">search_off</span>
                      No members match the current filter or search criteria.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between text-xs text-outline">
          <span>
            Showing {filteredMembers.length} of {members.length} members
          </span>
          {selectedPlan !== 'All' && (
            <button
              onClick={() => setSelectedPlan('All')}
              className="text-secondary font-bold hover:underline cursor-pointer"
            >
              Clear plan filter
            </button>
          )}
        </div>
      </div>

      {/* "HERE TODAY" & MERGED ATTENDANCE SECTION (Requirement 7: Today / Last Week / Last Month check-ins with plans) */}
      <div
        ref={attendanceSectionRef}
        className="rounded-2xl bg-surface-container-low border border-surface-container-high overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] mt-2"
      >
        <div className="p-4 sm:p-5 border-b border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#4edea3] animate-pulse" />
            <div>
              <h2 className="font-sora text-base sm:text-lg font-bold text-on-surface">
                Floor Attendance &amp; Check-in Log
              </h2>
              <p className="text-xs text-outline">
                Biometric &amp; QR check-ins categorized by Today, Last Week, and Last Month with member plans
              </p>
            </div>
          </div>

          {/* Timeframe Switcher Tabs & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAttendanceTimeframe('today')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  attendanceTimeframe === 'today'
                    ? 'bg-surface-container-lowest text-tertiary shadow-xs font-bold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span>Today</span>
                <span className="px-1.5 py-0.2 rounded-full bg-tertiary/20 text-tertiary text-[10px]">
                  {timeframeCounts.today}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAttendanceTimeframe('week')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  attendanceTimeframe === 'week'
                    ? 'bg-surface-container-lowest text-secondary shadow-xs font-bold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span>Last Week</span>
                <span className="px-1.5 py-0.2 rounded-full bg-secondary/20 text-secondary text-[10px]">
                  {timeframeCounts.week}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAttendanceTimeframe('month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  attendanceTimeframe === 'month'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span>Last Month</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px]">
                  {timeframeCounts.month}
                </span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                placeholder="Filter check-ins..."
                className="bg-surface-container pl-7 pr-2 py-1.5 rounded-lg text-xs text-on-surface border border-surface-container-high focus:outline-none focus:border-secondary w-36 sm:w-44"
              />
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-sm">
                search
              </span>
            </div>
          </div>
        </div>

        {/* Check-ins Table showing Members with their Plans */}
        <div className="overflow-x-auto">
          <table className="stack w-full text-left text-on-surface text-xs">
            <thead>
              <tr className="text-outline uppercase text-xs bg-surface-container-lowest border-b border-surface-container-high">
                <th className="py-2.5 px-4">Member Name</th>
                <th className="py-2.5 px-4">Gym Plan</th>
                <th className="py-2.5 px-4">Check-in Timestamp</th>
                <th className="py-2.5 px-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filteredCheckIns.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container/50 transition-colors">
                  <td data-label="Member Name" className="py-3 px-4 font-semibold text-on-surface">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center font-bold text-xs">
                        {log.memberName ? log.memberName[0] : 'M'}
                      </div>
                      <span>{log.memberName}</span>
                    </div>
                  </td>
                  <td data-label="Gym Plan" className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/15 text-primary text-xs font-bold border border-primary/30">
                      {log.planDuration}
                    </span>
                  </td>
                  <td data-label="Check-in Timestamp" className="py-3 px-4 text-on-surface-variant font-mono">
                    {formatTimestamp(log.checkedInAt)}
                  </td>
                  <td data-label="Verification" className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-tertiary">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>Verified Punch</span>
                    </span>
                  </td>
                </tr>
              ))}
              {filteredCheckIns.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 px-4 text-center text-outline">
                    <span className="material-symbols-outlined text-3xl block mb-2 text-outline/40">event_busy</span>
                    No check-ins recorded for this timeframe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between text-xs text-outline">
          <span>
            Total Check-ins in {attendanceTimeframe === 'today' ? 'Today' : attendanceTimeframe === 'week' ? 'Last Week' : 'Last Month'}:{' '}
            <strong className="text-on-surface">{filteredCheckIns.length}</strong>
          </span>
          <span className="text-[11px]">Automatic biometric &amp; cloud push active</span>
        </div>
      </div>
    </div>
  );
};
