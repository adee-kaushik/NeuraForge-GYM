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

  const yearDuesMembers = useMemo(() => {
    return members
      .map((m) => {
        const txDues = pending.filter((t) => t.memberId === m.id).reduce((acc, t) => acc + t.amount, 0);
        const due = (m.pendingDue && m.pendingDue > 0) ? m.pendingDue : txDues;
        return {
          member: m,
          due,
        };
      })
      .filter((item) => item.due > 0);
  }, [members, pending]);

  const total1YearDues = useMemo(() => {
    const fromTx = sum(last1YearPending, (t) => t.amount);
    const fromMembers = yearDuesMembers.reduce((acc, item) => acc + item.due, 0);
    return fromTx > 0 ? fromTx : fromMembers;
  }, [last1YearPending, yearDuesMembers]);

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

  const handlePrintAndDownloadReceipt = (r: Transaction) => {
    const rawDate = r.createdAt ? new Date(r.createdAt) : new Date();
    const dateStr = !isNaN(rawDate.getTime())
      ? rawDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : r.timestamp.split(',')[0] || r.timestamp;
    const timeStr = !isNaN(rawDate.getTime())
      ? rawDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : (r.timestamp.includes(',') ? r.timestamp.split(',')[1].trim() : 'N/A');

    const taxableAmount = Math.max(0, r.amount - r.gstAmount);

    const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${r.invoiceNo}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    @media print {
      body { margin: 0; padding: 0; background: #fff !important; }
      .receipt-container { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 24px;
      background: #f4f4f5;
      color: #18181b;
      display: flex;
      justify-content: center;
    }
    .receipt-container {
      background: #ffffff;
      width: 100%;
      max-width: 440px;
      padding: 28px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid #e4e4e7;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #d4d4d8;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .gym-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #09090b;
      margin: 0;
      text-transform: uppercase;
    }
    .gstin {
      font-size: 11px;
      color: #71717a;
      margin-top: 4px;
      font-weight: 500;
    }
    .badge-paid {
      display: inline-block;
      margin-top: 10px;
      padding: 3px 14px;
      font-size: 11px;
      font-weight: 800;
      color: #047857;
      background: #d1fae5;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #a1a1aa;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin-bottom: 7px;
    }
    .item-label { color: #71717a; font-weight: 500; }
    .item-value { font-weight: 600; color: #18181b; text-align: right; }
    .invoice-tag { font-family: monospace; font-size: 12px; font-weight: 700; color: #0284c7; }
    .dashed-divider {
      border-top: 1px dashed #d4d4d8;
      margin: 14px 0;
    }
    .total-box {
      background: #fafafa;
      border: 1px solid #f4f4f5;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 12px 0 8px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      font-weight: 800;
      color: #09090b;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      color: #a1a1aa;
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #f4f4f5;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h1 class="gym-title">${gym.name}</h1>
      <div class="gstin">${gym.gstNumber ? `GSTIN: ${gym.gstNumber}` : 'Official Gym Membership Receipt'}</div>
      <div class="badge-paid">✓ PAID · OFFICIAL RECEIPT</div>
    </div>

    <div class="section-title">Invoice Details</div>
    <div class="item-row">
      <span class="item-label">Invoice Number:</span>
      <span class="invoice-tag">${r.invoiceNo}</span>
    </div>
    <div class="item-row">
      <span class="item-label">Date:</span>
      <span class="item-value">${dateStr}</span>
    </div>
    <div class="item-row">
      <span class="item-label">Time:</span>
      <span class="item-value">${timeStr}</span>
    </div>

    <div class="dashed-divider"></div>

    <div class="section-title">Member &amp; Plan Information</div>
    <div class="item-row">
      <span class="item-label">Member Name:</span>
      <span class="item-value">${r.memberName}</span>
    </div>
    <div class="item-row">
      <span class="item-label">Plan / Package:</span>
      <span class="item-value">${r.planCategory}</span>
    </div>
    <div class="item-row">
      <span class="item-label">Payment Mode:</span>
      <span class="item-value">${r.paymentMode}</span>
    </div>
    <div class="item-row">
      <span class="item-label">Status:</span>
      <span class="item-value" style="color: #047857;">COMPLETED (PAID)</span>
    </div>

    <div class="dashed-divider"></div>

    <div class="item-row">
      <span class="item-label">Taxable Amount:</span>
      <span class="item-value">₹${taxableAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="item-row">
      <span class="item-label">GST (${gym.gstRatePercent}% Included):</span>
      <span class="item-value">₹${r.gstAmount.toLocaleString('en-IN')}</span>
    </div>

    <div class="total-box">
      <div class="total-row">
        <span>Grand Total:</span>
        <span style="color: #047857;">₹${r.amount.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div class="footer">
      Thank you for training at ${gym.name}!<br>
      This is a computer-generated tax receipt and requires no physical signature.
    </div>
  </div>
</body>
</html>`;

    // 1. Automatically download receipt file
    const blob = new Blob([receiptHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${r.invoiceNo}_${r.memberName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    // 2. Clean receipt print dialog via isolated iframe (not whole dashboard or popup window)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(receiptHtml);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1500);
      }, 350);
    }
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

        {/* Box 4: Last 1 Year Dues */}
        <div
          onClick={() => {
            setActiveKpiModal('year-dues');
            setKpiSearch('');
          }}
          className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high hover:border-amber-500/50 hover:bg-surface-container transition-all cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-md relative overflow-hidden"
          title="Click to view members with pending dues over the last 1 year"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/30 via-amber-500 to-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-outline">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider group-hover:text-amber-500 transition-colors">
                Last 1 Year Dues
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/25">
                365D
              </span>
            </div>
            <span className="material-symbols-outlined text-amber-500 text-xl group-hover:scale-110 transition-transform">
              history
            </span>
          </div>
          <div className="mt-2.5">
            <span className="font-sora text-2xl font-bold text-amber-500 block">
              {inr(total1YearDues)}
            </span>
            <div className="text-xs text-outline mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{yearDuesMembers.length} {yearDuesMembers.length === 1 ? 'member' : 'members'}</span>
              </span>
              <span className="text-amber-500 text-[11px] font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                <span>View</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </span>
            </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setActiveKpiModal(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-surface-container-low border border-secondary/40 rounded-2xl shadow-[0_0_50px_rgba(123,208,255,0.2)] overflow-hidden flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
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
                    : 'history'}
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
              {activeKpiModal === 'year-dues' && (() => {
                const filteredYearDues = yearDuesMembers.filter(
                  ({ member }) =>
                    !kpiSearch ||
                    member.name.toLowerCase().includes(kpiSearch.toLowerCase()) ||
                    member.phone.includes(kpiSearch) ||
                    member.planName.toLowerCase().includes(kpiSearch.toLowerCase())
                );

                return (
                  <div className="overflow-x-auto">
                    <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-base">history</span>
                        <span className="text-on-surface font-semibold">
                          Total Overdue Across Past 1 Year:
                        </span>
                        <span className="font-sora font-bold text-amber-500 text-sm">
                          {inr(total1YearDues)}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container font-mono text-[11px] font-bold text-outline">
                        {yearDuesMembers.length} {yearDuesMembers.length === 1 ? 'member' : 'members'} with dues
                      </span>
                    </div>

                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-outline uppercase text-[11px] border-b border-surface-container-high pb-2 bg-surface-container-low/50">
                          <th className="py-2.5 px-3">Member Name</th>
                          <th className="py-2.5 px-3">Phone Number</th>
                          <th className="py-2.5 px-3">Gym Plan</th>
                          <th className="py-2.5 px-3">Overdue Amount</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high/60">
                        {filteredYearDues.map(({ member: m, due }) => (
                          <tr key={m.id} className="hover:bg-surface-container/50 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-600 font-bold flex items-center justify-center text-xs shrink-0">
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-on-surface">{m.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-on-surface font-semibold text-[11px]">
                              {m.phone}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-on-surface font-semibold text-[11px]">
                                {m.planName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-sora font-bold text-error">{inr(due)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleSendWhatsAppReminder(m.name, m.phone, due, m.planName)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                title="Send WhatsApp overdue reminder"
                              >
                                <span className="material-symbols-outlined text-xs">chat</span>
                                <span>Remind</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredYearDues.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-outline">
                              {kpiSearch
                                ? `No overdue members match "${kpiSearch}".`
                                : 'No overdue members found for the past 1 year! All caught up!'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowManualModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-surface-container-low border border-primary-container/40 rounded-xl shadow-[0_0_40px_rgba(148,125,255,0.25)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="relative w-full max-w-md bg-surface-container-low border border-secondary/40 rounded-2xl shadow-[0_0_40px_rgba(123,208,255,0.25)] p-5 sm:p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const rawDate = selectedReceipt.createdAt ? new Date(selectedReceipt.createdAt) : new Date();
              const dateFormatted = !isNaN(rawDate.getTime())
                ? rawDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : selectedReceipt.timestamp.split(',')[0] || selectedReceipt.timestamp;
              const timeFormatted = !isNaN(rawDate.getTime())
                ? rawDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                : (selectedReceipt.timestamp.includes(',') ? selectedReceipt.timestamp.split(',')[1].trim() : 'N/A');

              return (
                <>
                  <div className="flex justify-between items-start pb-3 border-b border-surface-container-high">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-secondary text-lg">receipt_long</span>
                        <h3 className="font-sora text-base font-bold text-on-surface">Payment Receipt</h3>
                      </div>
                      <p className="text-outline text-xs mt-0.5">
                        {gym.name}{gym.gstNumber ? ` · GSTIN: ${gym.gstNumber}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedReceipt(null)}
                      className="text-outline hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                  </div>

                  {/* Clean Receipt Slip Design */}
                  <div className="bg-surface-container-lowest p-4 rounded-xl space-y-2.5 border border-surface-container-high shadow-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-surface-container-high/60">
                      <span className="text-outline text-[11px] uppercase font-bold tracking-wider">Invoice No:</span>
                      <span className="font-mono text-secondary font-bold text-xs">{selectedReceipt.invoiceNo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-outline">Date:</span>
                      <span className="font-semibold text-on-surface">{dateFormatted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-outline">Time:</span>
                      <span className="font-semibold text-on-surface">{timeFormatted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-outline">Member:</span>
                      <span className="font-bold text-on-surface">{selectedReceipt.memberName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-outline">Plan:</span>
                      <span className="font-medium text-on-surface">{selectedReceipt.planCategory}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-outline">Payment Mode:</span>
                      <span className="font-semibold text-on-surface">{selectedReceipt.paymentMode}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-outline">Status:</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-tertiary/15 text-tertiary border border-tertiary/30">
                        ✓ PAID
                      </span>
                    </div>
                    <div className="pt-2 border-t border-surface-container-high flex justify-between font-sora text-sm font-bold">
                      <span>Total Amount:</span>
                      <span className="text-tertiary">₹{selectedReceipt.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[11px] text-outline text-right">
                      Includes {gym.gstRatePercent}% GST ({inr(selectedReceipt.gstAmount)})
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col gap-2.5">
                    <button
                      onClick={() => {
                        const r = selectedReceipt;
                        const text =
                          `*${gym.name} — Official Payment Receipt*\n` +
                          `──────────────────\n` +
                          `Invoice: ${r.invoiceNo}\n` +
                          `Date: ${dateFormatted}\n` +
                          `Time: ${timeFormatted}\n` +
                          `Member: ${r.memberName}\n` +
                          `Plan: ${r.planCategory}\n` +
                          `Amount: ₹${r.amount.toLocaleString('en-IN')}\n` +
                          `Mode: ${r.paymentMode}\n` +
                          (gym.gstNumber ? `GSTIN: ${gym.gstNumber}\n` : '') +
                          `GST (${gym.gstRatePercent}%): ${inr(r.gstAmount)}\n` +
                          `──────────────────\n` +
                          `Status: ✅ PAID\n` +
                          `\nThank you for training with us!`;
                        const phone = members.find((m) => m.id === r.memberId)?.phone?.replace(/\D/g, '') ?? '';
                        window.open(
                          `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`,
                          '_blank'
                        );
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-[#25D366]/40 text-xs"
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      <span>Share Receipt on WhatsApp</span>
                    </button>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handlePrintAndDownloadReceipt(selectedReceipt)}
                        className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                        title="Automatically downloads receipt file and opens clean print dialog"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>Download &amp; Print Receipt</span>
                      </button>
                      <button
                        onClick={() => setSelectedReceipt(null)}
                        className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
