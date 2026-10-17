'use client';

import React, { useState, useMemo } from 'react';
import { Member, Transaction, CheckInLog, ActiveScreen } from '../types';
import { DashboardStats } from '../lib/stats';
import { inr } from '../lib/format';
import { GymBanner } from './GymBanner';
import type { GymConfig } from '../config/gym';

const PAYMENTS_PAGE_SIZE = 5;

interface DashboardViewProps {
  gym: GymConfig;
  onGymUpdate?: (updatedGym: GymConfig) => void;
  stats: DashboardStats;
  members: Member[];
  transactions: Transaction[];
  checkIns: CheckInLog[];
  onOpenBulkWhatsApp: (tab?: 'renewal' | 'announcement') => void;
  onViewAllExpiring: () => void;
  onSelectMember: (member: Member) => void;
  onSendSingleReminder: (member: Member) => void;
  onOpenAddMember?: () => void;
  onOpenImport?: () => void;
  onNavigateScreen?: (screen: ActiveScreen) => void;
  pendingEnrollments?: import('../types').EnrollmentRecord[];
  onOpenPendingEnrollments?: () => void;
  onOpenFrontDeskQr?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  gym,
  onGymUpdate,
  stats,
  members,
  transactions,
  checkIns,
  onOpenBulkWhatsApp,
  onViewAllExpiring,
  onSelectMember,
  onSendSingleReminder,
  onOpenAddMember,
  onOpenImport,
  onNavigateScreen,
  pendingEnrollments = [],
  onOpenPendingEnrollments,
  onOpenFrontDeskQr,
}) => {
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'UPI' | 'Cash' | 'Card' | 'Pending'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStatModal, setActiveStatModal] = useState<
    'total-members' | 'active-members' | 'expiring' | 'pending-due' | 'floor-entries' | null
  >(null);
  const [statSearch, setStatSearch] = useState('');

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (paymentFilter === 'All') return true;
    if (paymentFilter === 'UPI') return t.paymentMode === 'UPI';
    if (paymentFilter === 'Cash') return t.paymentMode === 'Cash';
    if (paymentFilter === 'Card') return t.paymentMode === 'Card';
    if (paymentFilter === 'Pending') return t.status === 'PENDING';
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAYMENTS_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageStart = (page - 1) * PAYMENTS_PAGE_SIZE;
  const pageRows = filteredTransactions.slice(pageStart, pageStart + PAYMENTS_PAGE_SIZE);
  const maxDayCount = Math.max(1, ...stats.last7Days.map((d) => d.count));

  const expiringMembers = members.filter((m) => m.status === 'expiring').slice(0, 5);
  const recentCheckIns = checkIns.slice(0, 4);

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* GYM HERO BANNER */}
      <GymBanner gym={gym} onGymUpdate={onGymUpdate} />

      {/* PENDING FRONT DESK QR SELF-ENROLLMENTS BANNER */}
      {pendingEnrollments && pendingEnrollments.length > 0 && (
        <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-secondary/20 via-primary/15 to-[#4edea3]/20 border border-secondary/50 shadow-[0_0_35px_rgba(123,208,255,0.2)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-[#001f28] flex items-center justify-center font-bold text-2xl shadow-sm shrink-0 animate-bounce">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                  {pendingEnrollments.length === 1
                    ? `1 New Candidate Enrolled via Front Desk QR!`
                    : `${pendingEnrollments.length} New Candidates Enrolled via Front Desk QR!`}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-[#001f28] uppercase tracking-wider">
                  Needs Approval
                </span>
              </div>
              <p className="text-xs text-outline mt-0.5">
                Prospective members scanned your desk QR &amp; submitted their plan, slot and UPI details. Review &amp; approve to activate biometric pass.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPendingEnrollments && (
              <button
                type="button"
                onClick={onOpenPendingEnrollments}
                className="px-4 py-2 rounded-xl bg-secondary text-[#001f28] font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">how_to_reg</span>
                <span>Review &amp; Approve ({pendingEnrollments.length})</span>
              </button>
            )}
            {onOpenFrontDeskQr && (
              <button
                type="button"
                onClick={onOpenFrontDeskQr}
                className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary border border-secondary/30 transition-colors cursor-pointer"
                title="View Front Desk QR Poster"
              >
                <span className="material-symbols-outlined text-lg">qr_code_2</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 0. ONBOARDING HERO FOR EMPTY GYM */}
      {members.length === 0 && (
        <section className="relative w-full overflow-hidden bg-surface-container-low rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] border border-primary/40 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                <span>Welcome to NeuraFitness</span>
              </div>
              <h2 className="font-sora text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                Your Gym Workspace is Ready
              </h2>
              <p className="text-xs sm:text-sm text-outline leading-relaxed">
                Add your members manually or import them in bulk from an Excel or CSV spreadsheet to start tracking memberships, check-ins, payments, and automated WhatsApp renewals.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto shrink-0">
              {onOpenAddMember && (
                <button
                  onClick={onOpenAddMember}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-primary-container hover:bg-[#cabeff] text-on-primary-container font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(148,125,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  <span>Add First Member</span>
                </button>
              )}
              {onOpenImport && (
                <button
                  onClick={onOpenImport}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-secondary font-bold text-xs sm:text-sm border border-secondary/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  <span>Import Excel / CSV</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 1. EXPIRING MEMBERS PART ON TOP (ALERT STRIP + EXPIRING TABLE) */}
      {!noticeDismissed && stats.expiringIn48h > 0 && (
        <section className="relative w-full overflow-hidden bg-surface-container-low rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.45)] border border-surface-container-high">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#7bd0ff] to-transparent opacity-80"></div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#cabeff] to-transparent opacity-60"></div>

          <div className="px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-primary-container/10 via-surface-container-low to-secondary-container/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-high text-secondary shadow-[0_0_12px_rgba(123,208,255,0.35)] shrink-0 border border-secondary/30">
                <span className="material-symbols-outlined text-lg animate-pulse">notifications_active</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-sans text-xs uppercase tracking-widest text-secondary font-bold bg-secondary/15 px-2 py-0.5 rounded border border-secondary/30">
                  Expiry Alert
                </span>
                <span className="font-sans text-xs text-error font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-error inline-block animate-ping"></span>
                  {stats.expiringIn48h} {stats.expiringIn48h === 1 ? 'membership expires' : 'memberships expire'} within 48 hours and need follow-up.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 flex-wrap">
              <button
                onClick={() => onOpenBulkWhatsApp('renewal')}
                className="group flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#15803d] font-bold text-xs sm:text-sm transition-all border border-[#25D366]/40 shadow-xs cursor-pointer"
                title="Send automated bulk WhatsApp reminder with personalized name & plan"
              >
                <span className="material-symbols-outlined text-base sm:text-lg">chat</span>
                <span className="font-sans font-bold tracking-wide">
                  Send Bulk Reminder [WhatsApp]
                </span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </button>

              <button
                onClick={() => onOpenBulkWhatsApp('announcement')}
                className="group flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs sm:text-sm transition-all border border-surface-container-highest shadow-xs cursor-pointer"
                title="Broadcast Gym Notice to all active members"
              >
                <span className="material-symbols-outlined text-base sm:text-lg text-secondary">campaign</span>
                <span className="font-sans font-bold tracking-wide">
                  Gym Notice
                </span>
              </button>

              <button
                onClick={() => setNoticeDismissed(true)}
                className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer"
                title="Dismiss Notice"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* EXPIRING MEMBERSHIPS FULL SECTION ON TOP */}
      <section className="bg-surface-container-low rounded-xl p-4 sm:p-6 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.35)] relative border border-surface-container-high">
        <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-error/50"></div>
        <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-error/50"></div>

        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container-high/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-2xl">event_busy</span>
                <h2 className="font-sora text-lg sm:text-xl font-bold text-on-surface">
                  Expiring Memberships & Renewals
                </h2>
              </div>
              <p className="text-xs text-outline mt-0.5">
                Priority follow-ups. Tap on any member to view details or send 1-tap WhatsApp renewal notice.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onOpenBulkWhatsApp('renewal')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#15803d] border border-[#25D366]/40 text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Send bulk reminder to all expiring members"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                <span>Send Bulk Reminder</span>
              </button>
              <span className="px-3 py-1 rounded-full bg-error-container/30 text-error text-xs font-bold border border-error/30">
                {stats.expiringThisWeek} EXPIRING THIS WEEK
              </span>
              <button
                onClick={onViewAllExpiring}
                className="text-xs text-secondary hover:underline font-bold cursor-pointer"
              >
                View All
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto mt-3">
            <table className="stack w-full text-left text-on-surface text-xs">
              <thead>
                <tr className="text-outline uppercase text-[11px] bg-surface-container-lowest/60 rounded-lg">
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-2">Plan</th>
                  <th className="py-2.5 px-2">Expiry Date</th>
                  <th className="py-2.5 px-2">Days Remaining</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/60">
                {expiringMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-outline">
                      No members expiring this week. All memberships are active!
                    </td>
                  </tr>
                ) : (
                  expiringMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-surface-container/60 transition-colors group cursor-pointer"
                      onClick={() => onSelectMember(member)}
                    >
                      <td data-label="Member" className="py-3 px-3">
                        <div className="font-semibold text-on-surface group-hover:text-secondary transition-colors">
                          {member.name}
                        </div>
                        <div className="text-[11px] text-outline">{member.phone}</div>
                      </td>
                      <td data-label="Plan" className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                          {member.planDuration}
                        </span>
                      </td>
                      <td data-label="Expiry" className="py-3 px-2 text-on-surface-variant font-mono text-[11px]">
                        {member.expiryDate}
                      </td>
                      <td data-label="Time Left" className="py-3 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            member.daysLeft <= 3
                              ? 'bg-error-container/50 text-error border border-error/30'
                              : member.daysLeft <= 5
                              ? 'bg-secondary-container/20 text-secondary'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {member.daysLeft} Days Left
                        </span>
                      </td>
                      <td data-label="" className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSendSingleReminder(member)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold transition-all shadow-[0_0_8px_rgba(37,211,102,0.15)] border border-[#25D366]/30 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 bg-surface-container-lowest/40 px-3 py-2 rounded-lg border border-surface-container-high">
          <span className="text-xs text-outline">
            Showing {expiringMembers.length} of {stats.expiringThisWeek} expiring members
          </span>
          <button
            onClick={onViewAllExpiring}
            className="text-xs text-secondary hover:text-secondary-fixed flex items-center gap-1 font-bold group cursor-pointer"
          >
            <span>View All Expiring Members</span>
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
        </div>
      </section>

      {/* 2. MONTHLY GOALS PART AFTER EXPIRING MEMBERS */}
      <section className="relative bg-surface-container-low rounded-xl p-5 sm:p-6 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-surface-container-high">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-secondary/70"></div>
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-secondary/70"></div>
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-primary/70"></div>
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-primary/70"></div>

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shadow-[0_0_16px_rgba(148,125,255,0.3)] border border-primary-container/30">
                <span className="material-symbols-outlined text-2xl">trending_up</span>
              </div>
              <div>
                <span className="font-sora text-lg font-semibold text-on-surface block">
                  Monthly Revenue Goal
                </span>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Monthly collection target vs actual revenue
                </p>
              </div>
            </div>

            <div className="flex items-baseline gap-2 self-start md:self-auto bg-surface-container px-4 py-2 rounded-lg border border-surface-container-high">
              <span className="font-sora text-xl font-bold text-primary">{inr(stats.revenueThisMonth)}</span>
              <span className="text-sm text-outline">/ {inr(stats.goal)} goal</span>
              <span className="ml-2 text-xs text-secondary font-bold">({stats.goalPercent}%)</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="relative w-full h-5 rounded-full bg-surface-container-lowest overflow-hidden p-0.5 border border-surface-container-high">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#cabeff] via-[#947dff] to-[#7bd0ff] shadow-[0_0_20px_rgba(123,208,255,0.6)] relative flex items-center justify-end transition-all duration-1000"
                style={{ width: `${stats.goalPercent}%` }}
              >
                <div className="w-2 h-full bg-white rounded-full animate-ping opacity-75"></div>
              </div>
              <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none">
                <div className="h-full w-0.5 bg-surface-container-highest/80"></div>
                <div className="h-full w-0.5 bg-surface-container-highest/80"></div>
              </div>
            </div>

            <div className="flex justify-between text-xs text-outline px-1 font-medium">
              <span>₹0</span>
              <span>{inr(stats.goal / 2)} (50%)</span>
              <span className="text-secondary font-semibold">Now: {stats.goalPercent}%</span>
              <span className="text-primary font-bold">Goal {inr(stats.goal)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 bg-surface-container/60 p-3 rounded-lg border border-surface-container-high">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">flag</span>
              <span className="text-xs text-on-surface">
                <strong className="text-secondary font-semibold">
                  {stats.remainingToGoal > 0 ? `${inr(stats.remainingToGoal)} left` : 'Goal reached'}
                </strong>
                {stats.remainingToGoal > 0 ? ' to reach this month’s goal' : ' — congratulations!'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-outline text-xs shrink-0">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>{stats.daysLeftInMonth} days left this month</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CLICKABLE STAT BOXES (5 BOXES, REVENUE BOX REMOVED) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Members */}
        <div
          onClick={() => {
            setActiveStatModal('total-members');
            setStatSearch('');
          }}
          className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container hover:scale-[1.02] active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-secondary/60 cursor-pointer"
          title="Click to view all members list in popup"
        >
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-secondary opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-secondary opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline group-hover:text-secondary transition-colors">
              Total Members
            </span>
            <span className="material-symbols-outlined text-xl text-secondary">groups</span>
          </div>
          <div>
            <div className="font-sora text-3xl font-bold text-on-surface tracking-tight group-hover:text-secondary-fixed transition-colors">
              {stats.totalMembers}
            </div>
            <div className="flex items-center gap-1 mt-1 text-tertiary text-xs font-semibold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>+{stats.newThisMonth} joined · Click to view</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Members (renamed from Active Roster) */}
        <div
          onClick={() => {
            setActiveStatModal('active-members');
            setStatSearch('');
          }}
          className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container hover:scale-[1.02] active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-tertiary/60 cursor-pointer"
          title="Click to view active members list in popup"
        >
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-tertiary opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-tertiary opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline group-hover:text-tertiary transition-colors">
              Active Members
            </span>
            <span className="px-2 py-0.5 rounded bg-tertiary/15 text-tertiary text-xs font-bold tracking-wider flex items-center gap-1 border border-tertiary/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span> ONLINE
            </span>
          </div>
          <div>
            <div className="font-sora text-3xl font-bold text-on-surface tracking-tight group-hover:text-tertiary transition-colors">
              {stats.activeMembers}
            </div>
            <div className="flex items-center gap-1 mt-1 text-on-surface-variant text-xs">
              <span>{stats.activePercent}% active · Click to view</span>
            </div>
          </div>
        </div>

        {/* Card 3: Expiring This Week */}
        <div
          onClick={() => {
            setActiveStatModal('expiring');
            setStatSearch('');
          }}
          className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container hover:scale-[1.02] active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-error/60 cursor-pointer"
          title="Click to view expiring members list in popup"
        >
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-error opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-error opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline group-hover:text-error transition-colors">
              Expiring This Week
            </span>
            <span className="px-2 py-0.5 rounded bg-error-container/40 text-error text-xs font-bold tracking-wider border border-error/30">
              CRITICAL
            </span>
          </div>
          <div>
            <div className="font-sora text-3xl font-bold text-error tracking-tight drop-shadow-[0_0_10px_rgba(255,180,171,0.3)]">
              {stats.expiringThisWeek}
            </div>
            <div className="flex items-center gap-1 mt-1 text-on-surface-variant text-xs">
              <span>Needs renewal · Click to view</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Payments */}
        <div
          onClick={() => {
            setActiveStatModal('pending-due');
            setStatSearch('');
          }}
          className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container hover:scale-[1.02] active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-secondary/60 cursor-pointer"
          title="Click to view pending dues list in popup"
        >
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-secondary opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-secondary opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline group-hover:text-secondary transition-colors">
              Pending Due
            </span>
            <span className="material-symbols-outlined text-xl text-primary">pending_actions</span>
          </div>
          <div>
            <div className="font-sora text-2xl lg:text-3xl font-bold text-on-surface tracking-tight group-hover:text-secondary transition-colors">
              {inr(stats.pendingAmount)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-secondary text-xs">
              <span>{stats.pendingCount} dues · Click to view</span>
            </div>
          </div>
        </div>

        {/* Card 5: Today's Floor Entries */}
        <div
          onClick={() => {
            setActiveStatModal('floor-entries');
            setStatSearch('');
          }}
          className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container hover:scale-[1.02] active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-tertiary/60 cursor-pointer"
          title="Click to view today's floor entries in popup"
        >
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-tertiary opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-tertiary opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline group-hover:text-tertiary transition-colors">
              Floor Entries
            </span>
            <span className="material-symbols-outlined text-xl text-tertiary">how_to_reg</span>
          </div>
          <div>
            <div className="font-sora text-3xl font-bold text-on-surface tracking-tight group-hover:text-tertiary transition-colors">
              {stats.todayEntries}
            </div>
            <div className="flex items-center gap-1 mt-1 text-on-surface-variant text-xs">
              <span className="truncate">{stats.peakHourLabel ? `Busiest: ${stats.peakHourLabel}` : 'Live check-ins'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FLOOR VELOCITY (CONNECTED TO BIOMETRICS) & RECENT PAYMENTS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FLOOR VELOCITY CONNECTED TO BIOMETRICS (5 cols on 12-col grid) */}
        <div className="lg:col-span-5 bg-surface-container-low rounded-xl p-4 sm:p-6 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.35)] relative border border-surface-container-high">
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-tertiary/60"></div>
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-tertiary/60"></div>

          <div>
            {/* Header with Biometrics Connection */}
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-ping"></span>
                  <h2 className="font-sora text-lg font-semibold text-on-surface">Floor Velocity</h2>
                </div>
                <p className="text-xs text-outline mt-0.5">
                  Live entries: <strong className="text-tertiary">{stats.todayEntries} today</strong>
                </p>
              </div>

              {/* Connected Biometrics Beacon */}
              <button
                type="button"
                onClick={() => onNavigateScreen?.('attendance')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-tertiary/15 hover:bg-tertiary/25 text-tertiary border border-tertiary/30 text-[11px] font-bold transition-all cursor-pointer"
                title="Connected to eSSL, ZKTeco and QR check-in"
              >
                <span className="material-symbols-outlined text-sm">fingerprint</span>
                <span>Biometrics Live</span>
              </button>
            </div>

            {/* 7-Day Attendance Mini Bar Chart */}
            <div className="bg-surface-container-lowest/60 p-4 rounded-xl my-4 border border-surface-container-high">
              <div className="flex items-end justify-between h-28 gap-2 pt-2">
                {stats.last7Days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <span
                      className={`text-xs transition-colors ${
                        d.isToday ? 'text-tertiary font-bold' : 'text-outline group-hover:text-primary'
                      }`}
                    >
                      {d.count}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all ${
                        d.isToday
                          ? 'bg-gradient-to-t from-[#947dff] to-[#4edea3] shadow-[0_0_12px_rgba(78,222,163,0.5)]'
                          : 'bg-surface-container-highest hover:bg-primary-container/70'
                      }`}
                      style={{ height: `${Math.max(4, Math.round((d.count / maxDayCount) * 100))}%` }}
                    ></div>
                    <span className={`text-xs ${d.isToday ? 'text-tertiary font-bold' : 'text-outline'}`}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Check-in list (Recent 4 entries with Biometric/QR badge) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs uppercase tracking-wider text-outline">
                  Recent Biometric & QR Check-ins
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateScreen?.('attendance')}
                  className="text-[11px] text-secondary font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              {recentCheckIns.length === 0 ? (
                <div className="p-4 text-center text-outline text-xs bg-surface-container/40 rounded-lg">
                  No check-ins recorded yet today.
                </div>
              ) : (
                recentCheckIns.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-container/60 hover:bg-surface-container transition-colors border border-surface-container-high/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                        {item.memberName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="font-medium text-on-surface leading-tight text-xs">
                          {item.memberName}
                        </div>
                        <div className="text-[11px] text-outline flex items-center gap-1.5">
                          <span>{item.time}</span>
                          <span>·</span>
                          <span className="text-tertiary flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">verified</span>
                            <span>Biometric</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                      {item.planDuration}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RECENT PAYMENTS CARD (7 cols on 12-col grid) */}
        <div className="lg:col-span-7 relative bg-surface-container-low rounded-xl p-4 sm:p-6 overflow-hidden shadow-[0_4px_32px_rgba(0,0,0,0.4)] border border-surface-container-high flex flex-col justify-between">
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-secondary/60"></div>
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-secondary/60"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-primary/60"></div>
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-primary/60"></div>

          <div>
            {/* Section Header with Filter Chips */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
                  <h2 className="font-sora text-lg font-semibold text-on-surface">
                    Recent Payments
                  </h2>
                </div>
                <p className="text-xs text-outline mt-0.5">
                  Latest gym collections across UPI, cash and card
                </p>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {(['All', 'UPI', 'Cash', 'Card', 'Pending'] as const).map((f) => {
                  const count =
                    f === 'All'
                      ? transactions.length
                      : transactions.filter((t) =>
                          f === 'Pending'
                            ? t.status === 'PENDING'
                            : t.paymentMode.includes(f)
                        ).length;

                  const isActive = paymentFilter === f;

                  return (
                    <button
                      key={f}
                      onClick={() => {
                        setPaymentFilter(f);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-primary-container text-on-primary-container shadow-[0_0_8px_rgba(148,125,255,0.3)]'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-surface-container-high'
                      }`}
                    >
                      {f} {f === 'All' ? `(${transactions.length})` : `(${count})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payments Table */}
            <div className="overflow-x-auto mt-3">
              <table className="stack w-full text-left text-on-surface text-xs">
                <thead>
                  <tr className="text-outline uppercase text-[11px] bg-surface-container-lowest/60 rounded-lg">
                    <th className="py-2.5 px-3">Invoice & Member</th>
                    <th className="py-2.5 px-2">Mode</th>
                    <th className="py-2.5 px-2">Amount</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-outline">
                        No payments found for this filter.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-container/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[10px] text-outline block">{t.invoiceNo}</span>
                          <span className="font-medium text-on-surface">{t.memberName}</span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-highest text-on-surface">
                            {t.paymentMode}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-on-surface">
                          {inr(t.amount)}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'PAID'
                                ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                                : 'bg-error/15 text-error border border-error/30'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-outline text-[11px]">
                          {t.timestamp}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-container-high/60 text-xs text-outline">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-surface-container-high bg-surface-container hover:bg-surface-container-highest disabled:opacity-40 cursor-pointer font-bold"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-surface-container-high bg-surface-container hover:bg-surface-container-highest disabled:opacity-40 cursor-pointer font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* POPUP MODAL ON STAT BOX CLICKS (With Top-Right Cross to Close) */}
      {activeStatModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setActiveStatModal(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-surface-container-low border border-secondary/40 rounded-2xl shadow-[0_0_50px_rgba(123,208,255,0.2)] overflow-hidden flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-2xl">
                  {activeStatModal === 'total-members' && 'groups'}
                  {activeStatModal === 'active-members' && 'verified_user'}
                  {activeStatModal === 'expiring' && 'warning'}
                  {activeStatModal === 'pending-due' && 'pending_actions'}
                  {activeStatModal === 'floor-entries' && 'how_to_reg'}
                </span>
                <div>
                  <h3 className="font-sora text-base font-bold text-on-surface">
                    {activeStatModal === 'total-members' && `Total Members Roster (${members.length})`}
                    {activeStatModal === 'active-members' && `Active Members (${stats.activeMembers})`}
                    {activeStatModal === 'expiring' && `Expiring This Week (${stats.expiringThisWeek})`}
                    {activeStatModal === 'pending-due' && `Pending Payments (${stats.pendingCount})`}
                    {activeStatModal === 'floor-entries' && `Today's Floor Entries (${checkIns.length})`}
                  </h3>
                  <p className="text-xs text-outline">
                    {activeStatModal === 'total-members' && 'Complete list of all registered members and plans'}
                    {activeStatModal === 'active-members' && 'Members with valid, active memberships'}
                    {activeStatModal === 'expiring' && 'Members needing renewal in the next 7 days'}
                    {activeStatModal === 'pending-due' && 'Members with pending fee dues to collect'}
                    {activeStatModal === 'floor-entries' && 'Floor check-ins recorded today via biometrics or QR'}
                  </p>
                </div>
              </div>

              {/* Close Button (Cross in Top-Right) */}
              <button
                onClick={() => setActiveStatModal(null)}
                className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer border border-surface-container-high"
                aria-label="Close popup"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Search within Popup */}
            <div className="px-4 py-2.5 bg-surface-container border-b border-surface-container-high flex items-center gap-2">
              <span className="material-symbols-outlined text-outline text-base">search</span>
              <input
                type="text"
                value={statSearch}
                onChange={(e) => setStatSearch(e.target.value)}
                placeholder="Search by member name, phone or plan..."
                className="bg-transparent border-none text-xs text-on-surface placeholder-outline focus:outline-none flex-1"
              />
              {statSearch && (
                <button onClick={() => setStatSearch('')} className="text-xs text-outline hover:text-on-surface">
                  Clear
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* 1. TOTAL MEMBERS & 2. ACTIVE MEMBERS */}
              {(activeStatModal === 'total-members' || activeStatModal === 'active-members') && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-outline uppercase text-[11px] border-b border-surface-container-high pb-2">
                        <th className="py-2 px-3">Member</th>
                        <th className="py-2 px-3">Plan</th>
                        <th className="py-2 px-3">Expiry Date</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/60">
                      {members
                        .filter((m) => (activeStatModal === 'active-members' ? m.status === 'active' : true))
                        .filter(
                          (m) =>
                            !statSearch ||
                            m.name.toLowerCase().includes(statSearch.toLowerCase()) ||
                            m.phone.includes(statSearch) ||
                            m.planName.toLowerCase().includes(statSearch.toLowerCase())
                        )
                        .map((m) => (
                          <tr
                            key={m.id}
                            onClick={() => {
                              setActiveStatModal(null);
                              onSelectMember(m);
                            }}
                            className="hover:bg-surface-container/60 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-on-surface hover:text-secondary">{m.name}</div>
                              <div className="text-[11px] text-outline font-mono">{m.phone}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold text-[11px]">
                                {m.planName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-on-surface-variant font-mono text-[11px]">{m.expiryDate}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  m.status === 'active'
                                    ? 'bg-tertiary-container/30 text-tertiary'
                                    : m.status === 'expiring'
                                    ? 'bg-secondary-container/30 text-secondary'
                                    : 'bg-error-container/30 text-error'
                                }`}
                              >
                                {m.daysLeft < 0 ? 'Expired' : `${m.daysLeft}d left`}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. EXPIRING THIS WEEK */}
              {activeStatModal === 'expiring' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-outline uppercase text-[11px] border-b border-surface-container-high pb-2">
                        <th className="py-2 px-3">Member</th>
                        <th className="py-2 px-3">Plan</th>
                        <th className="py-2 px-3">Expiry Date</th>
                        <th className="py-2 px-3">Days Left</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/60">
                      {members
                        .filter((m) => m.daysLeft >= 0 && m.daysLeft <= 7)
                        .filter(
                          (m) =>
                            !statSearch ||
                            m.name.toLowerCase().includes(statSearch.toLowerCase()) ||
                            m.phone.includes(statSearch) ||
                            m.planName.toLowerCase().includes(statSearch.toLowerCase())
                        )
                        .map((m) => (
                          <tr key={m.id} className="hover:bg-surface-container/60 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-on-surface">{m.name}</div>
                              <div className="text-[11px] text-outline font-mono">{m.phone}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold text-[11px]">
                                {m.planName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-on-surface-variant font-mono text-[11px]">{m.expiryDate}</td>
                            <td className="py-2.5 px-3 font-bold text-error">{m.daysLeft} days left</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => onSendSingleReminder(m)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] font-bold text-[11px] transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-xs">chat</span>
                                <span>Remind</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 4. PENDING DUES */}
              {activeStatModal === 'pending-due' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-outline uppercase text-[11px] border-b border-surface-container-high pb-2">
                        <th className="py-2 px-3">Member</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Plan</th>
                        <th className="py-2 px-3">Due Amount</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/60">
                      {members
                        .filter((m) => typeof m.pendingDue === 'number' && m.pendingDue > 0)
                        .filter(
                          (m) =>
                            !statSearch ||
                            m.name.toLowerCase().includes(statSearch.toLowerCase()) ||
                            m.phone.includes(statSearch) ||
                            m.planName.toLowerCase().includes(statSearch.toLowerCase())
                        )
                        .map((m) => (
                          <tr key={m.id} className="hover:bg-surface-container/60 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-on-surface">{m.name}</td>
                            <td className="py-2.5 px-3 font-mono text-secondary font-bold text-[11px]">{m.phone}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold text-[11px]">
                                {m.planName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-sora font-bold text-error">{inr(m.pendingDue || 0)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => onSendSingleReminder(m)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] font-bold text-[11px] transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-xs">chat</span>
                                <span>Remind</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      {members.filter((m) => typeof m.pendingDue === 'number' && m.pendingDue > 0).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-outline">
                            No members with pending dues!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 5. FLOOR ENTRIES */}
              {activeStatModal === 'floor-entries' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-outline uppercase text-[11px] border-b border-surface-container-high pb-2">
                        <th className="py-2 px-3">Member Name</th>
                        <th className="py-2 px-3">Gym Plan</th>
                        <th className="py-2 px-3">Time</th>
                        <th className="py-2 px-3 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/60">
                      {checkIns
                        .filter(
                          (c) =>
                            !statSearch ||
                            c.memberName.toLowerCase().includes(statSearch.toLowerCase()) ||
                            c.planDuration.toLowerCase().includes(statSearch.toLowerCase())
                        )
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-surface-container/60 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-on-surface">{c.memberName}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold text-[11px]">
                                {c.planDuration}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-outline font-mono text-[11px]">{c.time}</td>
                            <td className="py-2.5 px-3 text-right text-tertiary font-bold text-[11px]">
                              Verified Check-in
                            </td>
                          </tr>
                        ))}
                      {checkIns.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-outline">
                            No floor check-ins recorded yet today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between text-xs text-outline">
              <span>Press close or ESC to dismiss</span>
              <button
                onClick={() => setActiveStatModal(null)}
                className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
