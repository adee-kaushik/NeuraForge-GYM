'use client';

import React, { useState, useMemo } from 'react';
import { Member, MembershipPlan, NewPaymentInput, PaymentMode, Transaction } from '../types';
import { GymConfig } from '../config/gym';
import { inr, isSameDay, isSameMonth } from '../lib/format';

interface PaymentsViewProps {
  gym: GymConfig;
  plans: MembershipPlan[];
  members: Member[];
  transactions: Transaction[];
  onMarkPaid: (txnId: string) => Promise<void> | void;
  onNewPayment: (input: NewPaymentInput) => Promise<Transaction | null | void> | void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  gym,
  plans,
  members,
  transactions,
  onMarkPaid,
  onNewPayment,
}) => {
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [showManualModal, setShowManualModal] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<PaymentMode>('Cash');
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [busyPaidId, setBusyPaidId] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Detail Popups for KPI Boxes (Requirement 1, 2, 4, 5)
  const [activeKpiModal, setActiveKpiModal] = useState<
    'collected-month' | 'pending-dues' | 'collected-today' | 'year-dues' | null
  >(null);
  const [kpiSearch, setKpiSearch] = useState('');

  const now = useMemo(() => new Date(), []);
  const oneYearAgo = useMemo(() => new Date(now.getTime() - 365 * 86400000), [now]);

  // Derived datasets
  const paidThisMonth = useMemo(
    () => transactions.filter((t) => t.status === 'PAID' && isSameMonth(t.createdAt, now)),
    [transactions, now]
  );
  const paidToday = useMemo(
    () => transactions.filter((t) => t.status === 'PAID' && isSameDay(t.createdAt, now)),
    [transactions, now]
  );
  const pending = useMemo(() => transactions.filter((t) => t.status === 'PENDING'), [transactions]);
  const currentMonthPending = useMemo(
    () => transactions.filter((t) => t.status === 'PENDING' && isSameMonth(t.createdAt, now)),
    [transactions, now]
  );
  const last1YearPending = useMemo(
    () => transactions.filter((t) => t.status === 'PENDING' && new Date(t.createdAt) >= oneYearAgo),
    [transactions, oneYearAgo]
  );

  const sum = (list: Transaction[], pick: (t: Transaction) => number) => list.reduce((acc, t) => acc + pick(t), 0);
  const revenueThisMonth = sum(paidThisMonth, (t) => t.amount);
  const gstThisMonth = sum(paidThisMonth, (t) => t.gstAmount);
  const collectedToday = sum(paidToday, (t) => t.amount);
  const totalPending = sum(pending, (t) => t.amount);
  const total1YearDues = sum(last1YearPending, (t) => t.amount) || members.reduce((acc, m) => acc + (m.pendingDue || 0), 0);

  // Member lookup map
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) {
      map.set(m.id, m);
    }
    return map;
  }, [members]);

  const filtered = transactions.filter((t) => {
    if (filterMode === 'ALL') return true;
    if (filterMode === 'PENDING') return t.status === 'PENDING';
    return t.paymentMode === filterMode;
  });

  const openManualModal = () => {
    setMemberId('');
    setAmount('');
    setMode('Cash');
    setShowManualModal(true);
  };

  const handleSelectMember = (id: string) => {
    setMemberId(id);
    const m = members.find((x) => x.id === id);
    const plan = m && plans.find((p) => p.id === m.planId);
    if (plan) setAmount(String(plan.price));
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!memberId || !Number.isFinite(amt) || amt <= 0) return;

    setSubmittingPayment(true);
    const created = await onNewPayment({ memberId, amount: amt, paymentMode: mode });
    setSubmittingPayment(false);
    setShowManualModal(false);
    if (created && typeof created === 'object' && 'invoiceNo' in created) {
      setSelectedReceipt(created as Transaction);
    }
  };

  const handleMarkPaid = async (txnId: string) => {
    setBusyPaidId(txnId);
    await onMarkPaid(txnId);
    setBusyPaidId(null);
  };

  const handleSendWhatsAppReminder = (memberName: string, phone: string, amountNum: number, planName?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hi ${memberName}, your gym payment of ₹${amountNum.toLocaleString('en-IN')}${
        planName ? ` for ${planName}` : ''
      } at ${gym.name} is currently pending. Please clear your dues or pay via UPI to keep your membership uninterrupted.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Payments &amp; Collections</h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Track daily collections, monthly dues, GST tax invoices, and automated reminders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openManualModal}
            className="h-10 px-4 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold transition-all shadow-sm hover:opacity-90 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">add_card</span>
            <span className="hidden sm:inline">Record Cash / Counter Payment</span>
            <span className="sm:hidden">Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS (5 BOXES - All Clickable with Detail Popups) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Box 1: Collected This Month */}
        <div
          onClick={() => {
            setActiveKpiModal('collected-month');
            setKpiSearch('');
          }}
          className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high hover:border-tertiary/60 hover:bg-surface-container transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
          title="Click to view all members who paid this month"
        >
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-tertiary transition-colors">
              Collected This Month
            </span>
            <span className="material-symbols-outlined text-tertiary text-xl">payments</span>
          </div>
          <div className="mt-2">
            <span className="font-sora text-2xl font-bold text-tertiary">{inr(revenueThisMonth)}</span>
            <p className="text-xs text-outline mt-0.5 flex items-center gap-1">
              <span>{paidThisMonth.length} paid</span>
              <span className="text-tertiary font-bold">· Click to view list</span>
            </p>
          </div>
        </div>

        {/* Box 2: Pending Dues (Current Month Dues) */}
        <div
          onClick={() => {
            setActiveKpiModal('pending-dues');
            setKpiSearch('');
          }}
          className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high hover:border-error/60 hover:bg-surface-container transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
          title="Click to view current month dues with members and plans"
        >
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-error transition-colors">
              Pending Dues
            </span>
            <span className="material-symbols-outlined text-error text-xl">pending_actions</span>
          </div>
          <div className="mt-2">
            <span className="font-sora text-2xl font-bold text-error">{inr(totalPending)}</span>
            <p className="text-xs text-error mt-0.5 flex items-center gap-1">
              <span>{pending.length} pending</span>
              <span className="font-bold">· Click to view list</span>
            </p>
          </div>
        </div>

        {/* Box 3: Collected Today */}
        <div
          onClick={() => {
            setActiveKpiModal('collected-today');
            setKpiSearch('');
          }}
          className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high hover:border-primary/60 hover:bg-surface-container transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
          title="Click to see whose payment came today"
        >
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-primary transition-colors">
              Collected Today
            </span>
            <span className="material-symbols-outlined text-primary text-xl">today</span>
          </div>
          <div className="mt-2">
            <span className="font-sora text-2xl font-bold text-on-surface">{inr(collectedToday)}</span>
            <p className="text-xs text-outline mt-0.5 flex items-center gap-1">
              <span>{paidToday.length} today</span>
              <span className="text-primary font-bold">· Click to view</span>
            </p>
          </div>
        </div>

        {/* Box 4: Last 1 Year Dues (Requirement 5) */}
        <div
          onClick={() => {
            setActiveKpiModal('year-dues');
            setKpiSearch('');
          }}
          className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high hover:border-secondary/60 hover:bg-surface-container transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
          title="Click to view members with pending dues over the last 1 year"
        >
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-secondary transition-colors">
              Last 1 Year Dues
            </span>
            <span className="material-symbols-outlined text-secondary text-xl">history_toggle_drop_down</span>
          </div>
          <div className="mt-2">
            <span className="font-sora text-2xl font-bold text-secondary">{inr(total1YearDues)}</span>
            <p className="text-xs text-outline mt-0.5 flex items-center gap-1">
              <span>Past 365 days</span>
              <span className="text-secondary font-bold">· Click to view</span>
            </p>
          </div>
        </div>

        {/* Box 5: GST This Month */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">GST ({gym.gstRatePercent}%)</span>
            <span className="material-symbols-outlined text-outline text-xl">receipt</span>
          </div>
          <div className="mt-2">
            <span className="font-sora text-2xl font-bold text-outline">{inr(gstThisMonth)}</span>
            <p className="text-xs text-outline mt-0.5">GST included in plans</p>
          </div>
        </div>
      </div>

      {/* Transactions Audit Trail Table */}
      <div className="rounded-xl bg-surface-container-low border border-surface-container-high overflow-hidden shadow-[0_4px_32px_rgba(0,0,0,0.4)]">
        <div className="p-4 bg-surface-container-lowest border-b border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">receipt_long</span>
            <h3 className="font-sora text-sm font-semibold text-on-surface">
              Transaction Audit Trail ({filtered.length} Records)
            </h3>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'UPI', 'Cash', 'Card', 'PENDING'] as const).map((modeKey) => (
              <button
                key={modeKey}
                onClick={() => setFilterMode(modeKey)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === modeKey
                    ? 'bg-surface-container-high text-on-surface shadow-xs border border-surface-container-highest'
                    : 'text-outline hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {modeKey === 'ALL' ? 'All' : modeKey}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="stack w-full text-left text-on-surface text-xs">
            <thead>
              <tr className="text-outline uppercase text-xs bg-surface-container-lowest border-b border-surface-container-high">
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Member</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-surface-container/60 transition-colors">
                  <td data-label="Invoice No" className="py-3 px-4 font-mono font-bold text-secondary">
                    {t.invoiceNo}
                  </td>
                  <td data-label="Date" className="py-3 px-3 text-on-surface-variant font-mono">
                    {t.timestamp}
                  </td>
                  <td data-label="Member" className="py-3 px-3 font-semibold text-on-surface">
                    {t.memberName}
                  </td>
                  <td data-label="Plan" className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-xs font-semibold">
                      {t.planCategory}
                    </span>
                  </td>
                  <td data-label="Mode" className="py-3 px-3 text-on-surface-variant">
                    <span className="font-semibold">{t.paymentMode}</span>
                  </td>
                  <td data-label="Status" className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        t.status === 'PAID'
                          ? 'bg-tertiary-container/30 text-tertiary border border-tertiary/30'
                          : 'bg-error-container/40 text-error border border-error/30'
                      }`}
                    >
                      {t.status === 'PAID' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td data-label="Amount" className="py-3 px-3 font-sora font-bold text-on-surface">
                    {inr(t.amount)}
                  </td>
                  <td data-label="" className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {t.status === 'PENDING' && (
                        <button
                          onClick={() => handleMarkPaid(t.id)}
                          disabled={busyPaidId === t.id}
                          className="px-2.5 py-1 rounded-lg bg-tertiary text-[#002113] hover:opacity-90 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {busyPaidId === t.id ? 'Marking...' : 'Mark Paid'}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedReceipt(t)}
                        className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary border border-surface-container-high cursor-pointer transition-colors"
                        title="View Tax Receipt"
                      >
                        <span className="material-symbols-outlined text-base">receipt</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center text-outline">
                    No transactions match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL POPUP MODALS FOR KPI BOXES (With Top-Right Close Button) */}
      {activeKpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-surface-container-low border border-secondary/40 rounded-2xl shadow-[0_0_50px_rgba(123,208,255,0.2)] overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header with Close Button (X) */}
            <div className="p-4 sm:p-5 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-2xl">
                  {activeKpiModal === 'collected-month'
                    ? 'payments'
                    : activeKpiModal === 'pending-dues'
                    ? 'pending_actions'
                    : activeKpiModal === 'collected-today'
                    ? 'today'
                    : 'history_toggle_drop_down'}
                </span>
                <div>
                  <h3 className="font-sora text-base font-bold text-on-surface">
                    {activeKpiModal === 'collected-month' && 'Payments Collected This Month'}
                    {activeKpiModal === 'pending-dues' && 'Current Month Pending Dues'}
                    {activeKpiModal === 'collected-today' && "Today's Payments Received"}
                    {activeKpiModal === 'year-dues' && 'Last 1 Year Pending Dues'}
                  </h3>
                  <p className="text-xs text-outline">
                    {activeKpiModal === 'collected-month' && 'Members and gym plans who completed payments this month'}
                    {activeKpiModal === 'pending-dues' && 'Members with pending dues and their active plans'}
                    {activeKpiModal === 'collected-today' && 'Members whose payments came in today'}
                    {activeKpiModal === 'year-dues' && 'Members with overdue payments in the last 1 year with phone numbers'}
                  </p>
                </div>
              </div>

              {/* Close Button (Cross in Top-Right) */}
              <button
                onClick={() => setActiveKpiModal(null)}
                className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer border border-surface-container-high"
                aria-label="Close popup"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Quick Search inside Popup */}
            <div className="px-4 py-2.5 bg-surface-container border-b border-surface-container-high flex items-center gap-2">
              <span className="material-symbols-outlined text-outline text-base">search</span>
              <input
                type="text"
                value={kpiSearch}
                onChange={(e) => setKpiSearch(e.target.value)}
                placeholder="Search member name or plan..."
                className="bg-transparent border-none text-xs text-on-surface placeholder-outline focus:outline-none flex-1"
              />
              {kpiSearch && (
                <button onClick={() => setKpiSearch('')} className="text-xs text-outline hover:text-on-surface">
                  Clear
                </button>
              )}
            </div>

            {/* Modal Body: Lists */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* 1. COLLECTED THIS MONTH */}
              {activeKpiModal === 'collected-month' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-outline uppercase text-[11px] border-b border-surface-container-high pb-2">
                        <th className="py-2 px-3">Member Name</th>
                        <th className="py-2 px-3">Gym Plan</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/60">
                      {paidThisMonth
                        .filter(
                          (t) =>
                            !kpiSearch ||
                            t.memberName.toLowerCase().includes(kpiSearch.toLowerCase()) ||
                            t.planCategory.toLowerCase().includes(kpiSearch.toLowerCase())
                        )
                        .map((t) => (
                          <tr key={t.id} className="hover:bg-surface-container/50">
                            <td className="py-2.5 px-3 font-semibold text-on-surface">{t.memberName}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold text-[11px]">
                                {t.planCategory || memberMap.get(t.memberId)?.planName || 'Standard'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-sora font-bold text-tertiary">{inr(t.amount)}</td>
                            <td className="py-2.5 px-3 text-on-surface-variant">{t.paymentMode}</td>
                            <td className="py-2.5 px-3 text-outline font-mono text-[11px]">{t.timestamp}</td>
                          </tr>
                        ))}
                      {paidThisMonth.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-outline">
                            No payments collected this month yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. PENDING DUES (CURRENT MONTH) */}
              {activeKpiModal === 'pending-dues' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-outline uppercase text-[11px] border-b border-surface-container-high pb-2">
                        <th className="py-2 px-3">Member Name</th>
                        <th className="py-2 px-3">Gym Plan</th>
                        <th className="py-2 px-3">Pending Due</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/60">
                      {pending
                        .filter(
                          (t) =>
                            !kpiSearch ||
                            t.memberName.toLowerCase().includes(kpiSearch.toLowerCase()) ||
                            t.planCategory.toLowerCase().includes(kpiSearch.toLowerCase())
                        )
                        .map((t) => {
                          const mem = memberMap.get(t.memberId);
                          const planName = t.planCategory || mem?.planName || 'Plan';
                          const phone = mem?.phone || 'N/A';
                          return (
                            <tr key={t.id} className="hover:bg-surface-container/50">
                              <td className="py-2.5 px-3 font-semibold text-on-surface">{t.memberName}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold text-[11px]">
                                  {planName}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-sora font-bold text-error">{inr(t.amount)}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-outline">{phone}</td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleSendWhatsAppReminder(t.memberName, phone, t.amount, planName)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] font-bold text-[11px] transition-all cursor-pointer"
                                  title="Send WhatsApp payment reminder"
                                >
                                  <span className="material-symbols-outlined text-xs">chat</span>
                                  <span>Remind</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      {pending.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-outline">
                            No pending dues for this period. All caught up!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. COLLECTED TODAY */}
              {activeKpiModal === 'collected-today' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-outline uppercase text-[11px] border-b border-surface-container-high pb-2">
                        <th className="py-2 px-3">Member Name</th>
                        <th className="py-2 px-3">Gym Plan</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/60">
                      {paidToday
                        .filter(
                          (t) =>
                            !kpiSearch ||
                            t.memberName.toLowerCase().includes(kpiSearch.toLowerCase()) ||
                            t.planCategory.toLowerCase().includes(kpiSearch.toLowerCase())
                        )
                        .map((t) => (
                          <tr key={t.id} className="hover:bg-surface-container/50">
                            <td className="py-2.5 px-3 font-semibold text-on-surface">{t.memberName}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold text-[11px]">
                                {t.planCategory || memberMap.get(t.memberId)?.planName || 'Standard'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-sora font-bold text-tertiary">{inr(t.amount)}</td>
                            <td className="py-2.5 px-3 text-on-surface-variant font-medium">{t.paymentMode}</td>
                            <td className="py-2.5 px-3 text-outline font-mono text-[11px]">{t.timestamp}</td>
                          </tr>
                        ))}
                      {paidToday.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-outline">
                            No payments recorded yet today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 4. LAST 1 YEAR DUES (Name & Phone Number & Plan) */}
              {activeKpiModal === 'year-dues' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-outline uppercase text-[11px] border-b border-surface-container-high pb-2">
                        <th className="py-2 px-3">Member Name</th>
                        <th className="py-2 px-3">Phone Number</th>
                        <th className="py-2 px-3">Gym Plan</th>
                        <th className="py-2 px-3">Overdue Amount</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/60">
                      {members
                        .filter((m) => (m.pendingDue && m.pendingDue > 0) || pending.some((t) => t.memberId === m.id))
                        .filter(
                          (m) =>
                            !kpiSearch ||
                            m.name.toLowerCase().includes(kpiSearch.toLowerCase()) ||
                            m.phone.includes(kpiSearch) ||
                            m.planName.toLowerCase().includes(kpiSearch.toLowerCase())
                        )
                        .map((m) => {
                          const due = m.pendingDue || 0;
                          return (
                            <tr key={m.id} className="hover:bg-surface-container/50">
                              <td className="py-2.5 px-3 font-semibold text-on-surface">{m.name}</td>
                              <td className="py-2.5 px-3 font-mono text-secondary font-bold text-[11px]">
                                {m.phone}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold text-[11px]">
                                  {m.planName}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-sora font-bold text-error">{inr(due)}</td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleSendWhatsAppReminder(m.name, m.phone, due, m.planName)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] font-bold text-[11px] transition-all cursor-pointer"
                                  title="Send WhatsApp overdue reminder"
                                >
                                  <span className="material-symbols-outlined text-xs">chat</span>
                                  <span>Remind</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      {members.filter((m) => m.pendingDue && m.pendingDue > 0).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-outline">
                            No overdue members found for the past 1 year!
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
              <span>Press ESC or click close to dismiss</span>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Cash/Counter Payment Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-surface-container-low border border-primary-container/40 rounded-xl shadow-[0_0_40px_rgba(148,125,255,0.25)] overflow-hidden flex flex-col">
            <div className="p-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
              <h3 className="font-sora text-sm font-semibold text-on-surface">Record Cash / Counter Payment</h3>
              <button onClick={() => setShowManualModal(false)} className="text-outline hover:text-on-surface p-1 cursor-pointer">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-outline uppercase mb-1">Select Member</label>
                <select
                  value={memberId}
                  onChange={(e) => handleSelectMember(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-on-surface focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.planName}) · {m.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-outline uppercase mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 3500"
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-on-surface focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-outline uppercase mb-1">Payment Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as PaymentMode)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-on-surface focus:outline-none cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary font-bold shadow-sm hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-surface-container-low border border-secondary/40 rounded-xl shadow-[0_0_40px_rgba(123,208,255,0.25)] p-6 space-y-4 text-xs">
            <div className="flex justify-between items-start pb-3 border-b border-surface-container-high">
              <div>
                <h3 className="font-sora text-base font-bold text-on-surface">Payment Receipt</h3>
                <p className="text-outline text-xs mt-0.5">
                  {gym.name}{gym.gstNumber ? ` · GSTIN ${gym.gstNumber}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-outline hover:text-on-surface p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-lg space-y-2 border border-surface-container-high">
              <div className="flex justify-between">
                <span className="text-outline">Invoice Number:</span>
                <span className="font-mono text-secondary font-bold">{selectedReceipt.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Date:</span>
                <span>{selectedReceipt.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Member:</span>
                <span className="font-bold">{selectedReceipt.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Plan Description:</span>
                <span>{selectedReceipt.planCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Mode of Payment:</span>
                <span>{selectedReceipt.paymentMode}</span>
              </div>
              <div className="pt-2 border-t border-surface-container-high flex justify-between font-sora text-sm font-bold">
                <span>Total Amount:</span>
                <span className="text-tertiary">₹{selectedReceipt.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-xs text-outline text-right">
                Includes {gym.gstRatePercent}% GST ({inr(selectedReceipt.gstAmount)})
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={() => {
                  const r = selectedReceipt;
                  const text =
                    `*${gym.name} — Payment Receipt*\n` +
                    `──────────────────\n` +
                    `Invoice: ${r.invoiceNo}\n` +
                    `Date: ${r.timestamp}\n` +
                    `Plan: ${r.planCategory}\n` +
                    `Amount: ₹${r.amount.toLocaleString('en-IN')}\n` +
                    `Mode: ${r.paymentMode}\n` +
                    (gym.gstNumber ? `GSTIN: ${gym.gstNumber}\n` : '') +
                    `GST (${gym.gstRatePercent}%): ${inr(r.gstAmount)}\n` +
                    `──────────────────\n` +
                    `Status: ✅ PAID\n` +
                    `\nThank you, ${r.memberName}!`;
                  const phone = members.find((m) => m.id === r.memberId)?.phone?.replace(/\D/g, '') ?? '';
                  window.open(
                    `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`,
                    '_blank'
                  );
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-[#25D366]/40"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Share Receipt on WhatsApp</span>
              </button>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>Print Tax Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
