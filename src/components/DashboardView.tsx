import React, { useState } from 'react';
import { Member, Transaction, CheckInLog } from '../types';
import { DashboardStats } from '../lib/stats';
import { inr } from '../lib/format';

const PAYMENTS_PAGE_SIZE = 5;

interface DashboardViewProps {
  stats: DashboardStats;
  members: Member[];
  transactions: Transaction[];
  checkIns: CheckInLog[];
  onOpenBulkWhatsApp: () => void;
  onViewAllExpiring: () => void;
  onSelectMember: (member: Member) => void;
  onSendSingleReminder: (member: Member) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  members,
  transactions,
  checkIns,
  onOpenBulkWhatsApp,
  onViewAllExpiring,
  onSelectMember,
  onSendSingleReminder,
}) => {
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'UPI' | 'Cash' | 'Card' | 'Pending'>('All');
  const [currentPage, setCurrentPage] = useState(1);

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
      {/* 1. ALERT STRIP */}
      {!noticeDismissed && stats.expiringIn48h > 0 && (
        <section className="relative w-full overflow-hidden bg-surface-container-low rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.45)] border border-surface-container-high">
          {/* Neon Accent Lines */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#7bd0ff] to-transparent opacity-80"></div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#cabeff] to-transparent opacity-60"></div>

          {/* Corner accents */}
          <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-secondary opacity-90"></div>
          <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-secondary opacity-90"></div>
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-primary opacity-90"></div>
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-primary opacity-90"></div>

          <div className="px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-primary-container/10 via-surface-container-low to-secondary-container/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-high text-secondary shadow-[0_0_12px_rgba(123,208,255,0.35)] shrink-0 border border-secondary/30">
                <span className="material-symbols-outlined text-lg animate-pulse">notifications_active</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-sans text-xs uppercase tracking-widest text-secondary font-bold bg-secondary/15 px-2 py-0.5 rounded border border-secondary/30">
                  Reminder
                </span>
                <span className="font-sans text-xs text-error font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-error inline-block animate-ping"></span>
                  {stats.expiringIn48h} {stats.expiringIn48h === 1 ? 'membership expires' : 'memberships expire'} within 48 hours and need follow-up.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
              <button
                onClick={onOpenBulkWhatsApp}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/35 text-[#25D366] transition-all shadow-[0_0_12px_rgba(37,211,102,0.25)] border border-[#25D366]/40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span className="font-sans text-xs font-bold tracking-wide">
                  Send Bulk Reminder [WhatsApp]
                </span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
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

      {/* 2. ROW OF 6 STAT CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Members */}
        <div className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-secondary/40">
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-secondary opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-secondary opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline">Total Members</span>
            <span className="material-symbols-outlined text-xl text-secondary">groups</span>
          </div>
          <div>
            <div className="font-sora text-3xl font-bold text-on-surface tracking-tight group-hover:text-secondary-fixed transition-colors">
              {stats.totalMembers}
            </div>
            <div className="flex items-center gap-1 mt-1 text-tertiary text-xs font-semibold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>+{stats.newThisMonth} this month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Members */}
        <div className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-tertiary/40">
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-tertiary opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-tertiary opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline">Active Roster</span>
            <span className="px-2 py-0.5 rounded bg-tertiary/15 text-tertiary text-xs font-bold tracking-wider flex items-center gap-1 border border-tertiary/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span> ONLINE
            </span>
          </div>
          <div>
            <div className="font-sora text-3xl font-bold text-on-surface tracking-tight">{stats.activeMembers}</div>
            <div className="flex items-center gap-1 mt-1 text-on-surface-variant text-xs">
              <span>{stats.activePercent}% of members active</span>
            </div>
          </div>
        </div>

        {/* Card 3: Expiring This Week */}
        <div className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-error/40">
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-error opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-error opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline">Expiring This Week</span>
            <span className="px-2 py-0.5 rounded bg-error-container/40 text-error text-xs font-bold tracking-wider border border-error/30">
              CRITICAL
            </span>
          </div>
          <div>
            <div className="font-sora text-3xl font-bold text-error tracking-tight drop-shadow-[0_0_10px_rgba(255,180,171,0.3)]">
              {stats.expiringThisWeek}
            </div>
            <div className="flex items-center gap-1 mt-1 text-on-surface-variant text-xs">
              <span>Requires intervention</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Payments */}
        <div className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-secondary/40">
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-secondary opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-secondary opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline">Pending Due</span>
            <span className="material-symbols-outlined text-xl text-primary">pending_actions</span>
          </div>
          <div>
            <div className="font-sora text-2xl lg:text-3xl font-bold text-on-surface tracking-tight">{inr(stats.pendingAmount)}</div>
            <div className="flex items-center gap-1 mt-1 text-secondary text-xs">
              <span>{stats.pendingCount} {stats.pendingCount === 1 ? 'payment' : 'payments'} to collect</span>
            </div>
          </div>
        </div>

        {/* Card 5: Today's Attendance */}
        <div className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-tertiary/40">
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-tertiary opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-tertiary opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline">Floor Entries</span>
            <span className="material-symbols-outlined text-xl text-tertiary">how_to_reg</span>
          </div>
          <div>
            <div className="font-sora text-3xl font-bold text-on-surface tracking-tight">{stats.todayEntries}</div>
            <div className="flex items-center gap-1 mt-1 text-on-surface-variant text-xs">
              <span className="truncate">{stats.peakHourLabel ? `Busiest: ${stats.peakHourLabel}` : 'No check-ins yet'}</span>
            </div>
          </div>
        </div>

        {/* Card 6: Revenue This Month */}
        <div className="relative bg-surface-container-low rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-surface-container transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-surface-container-high hover:border-primary/40">
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-primary opacity-70"></div>
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-primary opacity-70"></div>
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-sans text-xs uppercase tracking-wider text-outline">Net Revenue</span>
            <span className="material-symbols-outlined text-xl text-primary">account_balance_wallet</span>
          </div>
          <div>
            <div className="font-sora text-2xl lg:text-3xl font-bold text-primary tracking-tight drop-shadow-[0_0_12px_rgba(202,190,255,0.4)]">
              {inr(stats.revenueThisMonth)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-tertiary text-xs font-semibold">
              <span>{stats.paidCountThisMonth} {stats.paidCountThisMonth === 1 ? 'payment' : 'payments'} this month</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WIDE CARD: MONTHLY REVENUE GOAL */}
      <section className="relative bg-surface-container-low rounded-xl p-5 sm:p-6 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-surface-container-high">
        {/* Glow ambient background */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-secondary/70"></div>
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-secondary/70"></div>
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-primary/70"></div>
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-primary/70"></div>

        <div className="relative z-10 flex flex-col gap-4">
          {/* Card Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shadow-[0_0_16px_rgba(148,125,255,0.3)] border border-primary-container/30">
                <span className="material-symbols-outlined text-2xl">trending_up</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-sora text-lg font-semibold text-on-surface">
                    Monthly Revenue Goal
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Target for this month
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
              {/* Progress Fill */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#cabeff] via-[#947dff] to-[#7bd0ff] shadow-[0_0_20px_rgba(123,208,255,0.6)] relative flex items-center justify-end transition-all duration-1000"
                style={{ width: `${stats.goalPercent}%` }}
              >
                <div className="w-2 h-full bg-white rounded-full animate-ping opacity-75"></div>
              </div>
              {/* Tick Markers */}
              <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none">
                <div className="h-full w-0.5 bg-surface-container-highest/80"></div>
                <div className="h-full w-0.5 bg-surface-container-highest/80"></div>
              </div>
            </div>

            {/* Milestones */}
            <div className="flex justify-between text-xs text-outline px-1 font-medium">
              <span>₹0</span>
              <span>{inr(stats.goal / 2)} (50%)</span>
              <span className="text-secondary font-semibold">Now: {stats.goalPercent}%</span>
              <span className="text-primary font-bold">Goal {inr(stats.goal)}</span>
            </div>
          </div>

          {/* Goal footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 bg-surface-container/60 p-3 rounded-lg border border-surface-container-high">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">flag</span>
              <span className="text-xs text-on-surface">
                <strong className="text-secondary font-semibold">{stats.remainingToGoal > 0 ? `${inr(stats.remainingToGoal)} left` : 'Goal reached'}</strong>{stats.remainingToGoal > 0 ? " to reach this month's goal" : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 text-outline text-xs shrink-0">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>{stats.daysLeftInMonth} {stats.daysLeftInMonth === 1 ? 'day' : 'days'} left this month</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TWO-COLUMN SPLIT SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Expiring Memberships (~60% = 7 cols on 12-col grid) */}
        <div className="lg:col-span-7 bg-surface-container-low rounded-xl p-4 sm:p-6 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.35)] relative border border-surface-container-high">
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-error/50"></div>
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-error/50"></div>

          <div>
            {/* Title & Subtitle */}
            <div className="flex items-start justify-between pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-xl">event_busy</span>
                  <h2 className="font-sora text-lg font-semibold text-on-surface">Expiring Memberships</h2>
                </div>
                <p className="text-xs text-outline mt-0.5">
                  Follow up with these members. One tap sends a WhatsApp reminder.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-error-container/30 text-error text-xs font-bold border border-error/30">
                {stats.expiringThisWeek} EXPIRING
              </span>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="stack w-full text-left text-on-surface text-xs">
                <thead>
                  <tr className="text-outline uppercase text-xs bg-surface-container-lowest/50 rounded-lg">
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-2">Plan</th>
                    <th className="py-2.5 px-2">Expiry</th>
                    <th className="py-2.5 px-2">Time Left</th>
                    <th className="py-2.5 px-3 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60">
                  {expiringMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-surface-container/60 transition-colors group cursor-pointer"
                      onClick={() => onSelectMember(member)}
                    >
                      <td data-label="Member" className="py-3 px-3">
                        <div className="font-medium text-on-surface group-hover:text-secondary transition-colors">
                          {member.name}
                        </div>
                        <div className="text-xs text-outline">{member.phone}</div>
                      </td>
                      <td data-label="Plan" className="py-3 px-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/15 text-primary border border-primary/30"
                        >
                          {member.planDuration}
                        </span>
                      </td>
                      <td data-label="Expiry" className="py-3 px-2 text-on-surface-variant font-mono text-[0.75rem]">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold transition-all shadow-[0_0_8px_rgba(37,211,102,0.15)] border border-[#25D366]/30 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                          <span>Remind</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between pt-4 mt-4 bg-surface-container-lowest/40 px-3 py-2.5 rounded-lg border border-surface-container-high">
            <span className="text-xs text-outline">Showing 5 of 19 expiring members</span>
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
        </div>

        {/* RIGHT COLUMN: Today's Attendance & Velocity (~40% = 5 cols on 12-col grid) */}
        <div className="lg:col-span-5 bg-surface-container-low rounded-xl p-4 sm:p-6 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.35)] relative border border-surface-container-high">
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-tertiary/60"></div>
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-tertiary/60"></div>

          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-ping"></span>
                  <h2 className="font-sora text-lg font-semibold text-on-surface">Floor Velocity</h2>
                </div>
                <p className="text-xs text-outline">
                  Live check-ins: <strong className="text-tertiary">{stats.todayEntries} {stats.todayEntries === 1 ? 'member' : 'members'} today</strong>
                </p>
              </div>
              <span className="text-xs text-secondary bg-secondary/15 px-2.5 py-1 rounded font-semibold border border-secondary/30">
                7-Day Trajectory
              </span>
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

            {/* Live Check-in list (Recent 4 entries) */}
            <div className="flex flex-col gap-2">
              <span className="font-sans text-xs uppercase tracking-wider text-outline">
                Recent Check-ins
              </span>

              {recentCheckIns.map((item) => (
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
                      <div className="text-xs text-outline">
                        Checked in at {item.time}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                    {item.planDuration}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM FULL-WIDTH CARD: RECENT PAYMENTS */}
      <section className="relative bg-surface-container-low rounded-xl p-4 sm:p-6 overflow-hidden shadow-[0_4px_32px_rgba(0,0,0,0.4)] border border-surface-container-high">
        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-secondary/60"></div>
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-secondary/60"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-primary/60"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-primary/60"></div>

        <div className="flex flex-col gap-4">
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
                Latest payments across UPI, cash and card
              </p>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['All', 'UPI', 'Cash', 'Card', 'Pending'] as const).map((filter) => {
                const count =
                  filter === 'All'
                    ? transactions.length
                    : transactions.filter((t) =>
                        filter === 'Pending'
                          ? t.status === 'PENDING'
                          : t.paymentMode.includes(filter)
                      ).length;

                const isActive = paymentFilter === filter;

                return (
                  <button
                    key={filter}
                    onClick={() => {
                      setPaymentFilter(filter);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container shadow-[0_0_8px_rgba(148,125,255,0.3)]'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-surface-container-high'
                    }`}
                  >
                    {filter} {filter === 'All' ? `(${transactions.length})` : `(${count})`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payments Data Table */}
          <div className="overflow-x-auto">
            <table className="stack w-full text-left text-on-surface text-xs">
              <thead>
                <tr className="text-outline uppercase text-xs bg-surface-container-lowest/50 rounded-lg">
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Plan / Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payment Mode</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/60">
                {pageRows.map((txn) => (
                  <tr key={txn.id} className="hover:bg-surface-container/60 transition-colors">
                    <td data-label="Invoice No" className="py-3 px-3 font-mono text-secondary font-medium">
                      {txn.invoiceNo}
                    </td>
                    <td data-label="Member" className="py-3 px-3">
                      <div className="font-medium text-on-surface">{txn.memberName}</div>
                      <div className="text-xs text-outline">{txn.memberEmail}</div>
                    </td>
                    <td data-label="Plan / Category" className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                        {txn.planCategory}
                      </span>
                    </td>
                    <td data-label="Amount" className="py-3 px-3 font-sora text-base font-semibold text-on-surface">
                      ₹{txn.amount.toLocaleString('en-IN')}
                    </td>
                    <td data-label="Payment Mode" className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-base">
                          {txn.paymentMode === 'UPI'
                            ? 'qr_code_2'
                            : txn.paymentMode === 'Cash'
                            ? 'payments'
                            : 'credit_card'}
                        </span>
                        <span>{txn.paymentMode}</span>
                      </div>
                    </td>
                    <td data-label="Timestamp" className="py-3 px-3 text-on-surface-variant font-mono text-[0.75rem]">
                      {txn.timestamp}
                    </td>
                    <td data-label="Status" className="py-3 px-3 text-right">
                      {txn.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-tertiary-container/30 text-tertiary text-xs font-bold shadow-[0_0_8px_rgba(78,222,163,0.2)] border border-tertiary/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span> PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-error-container/40 text-error text-xs font-bold shadow-[0_0_8px_rgba(255,180,171,0.2)] border border-error/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span> PENDING
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination & Summary */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-outline text-xs border-t border-surface-container-high/60">
            <span>
              {filteredTransactions.length === 0
                ? 'No payments to show'
                : `Showing ${pageStart + 1}-${pageStart + pageRows.length} of ${filteredTransactions.length} payments · GST included in amounts`}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed border border-surface-container-high"
              >
                Previous
              </button>
              <span className="text-on-surface font-mono">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors border border-surface-container-high cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
