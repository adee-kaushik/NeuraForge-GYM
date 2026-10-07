import React, { useState } from 'react';
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

  const now = new Date();
  const paidThisMonth = transactions.filter((t) => t.status === 'PAID' && isSameMonth(t.createdAt, now));
  const paidToday = transactions.filter((t) => t.status === 'PAID' && isSameDay(t.createdAt, now));
  const pending = transactions.filter((t) => t.status === 'PENDING');

  const sum = (list: Transaction[], pick: (t: Transaction) => number) => list.reduce((acc, t) => acc + pick(t), 0);
  const revenueThisMonth = sum(paidThisMonth, (t) => t.amount);
  const gstThisMonth = sum(paidThisMonth, (t) => t.gstAmount);
  const collectedToday = sum(paidToday, (t) => t.amount);
  const totalPending = sum(pending, (t) => t.amount);

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
    // Suggest the member's plan price (owner can change it)
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

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">
              account_balance_wallet
            </span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">
              Payments
            </h1>
          </div>
          <p className="text-xs text-outline mt-1">
            All payments, pending dues and GST invoices
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Collected This Month</span>
            <span className="material-symbols-outlined text-tertiary text-xl">payments</span>
          </div>
          <div className="mt-2">
            <span className="font-sora text-2xl font-bold text-tertiary">{inr(revenueThisMonth)}</span>
            <p className="text-xs text-outline mt-0.5">
              {paidThisMonth.length} paid {paidThisMonth.length === 1 ? 'payment' : 'payments'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Dues</span>
            <span className="material-symbols-outlined text-error text-xl">pending_actions</span>
          </div>
          <div className="mt-2">
            <span className="font-sora text-2xl font-bold text-error">{inr(totalPending)}</span>
            <p className="text-xs text-error mt-0.5">
              {pending.length} {pending.length === 1 ? 'payment' : 'payments'} to collect
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">GST This Month ({gym.gstRatePercent}%)</span>
            <span className="material-symbols-outlined text-secondary text-xl">receipt</span>
          </div>
          <div className="mt-2">
            <span className="font-sora text-2xl font-bold text-secondary">{inr(gstThisMonth)}</span>
            <p className="text-xs text-outline mt-0.5">Already included in plan prices</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Collected Today</span>
            <span className="material-symbols-outlined text-primary text-xl">today</span>
          </div>
          <div className="mt-2">
            <span className="font-sora text-2xl font-bold text-on-surface">{inr(collectedToday)}</span>
            <p className="text-xs text-outline mt-0.5">
              {paidToday.length} {paidToday.length === 1 ? 'payment' : 'payments'} today
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Transactions Table */}
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
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === modeKey
                    ? 'bg-primary-container text-on-primary-container shadow-[0_0_8px_rgba(148,125,255,0.3)]'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {modeKey}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="stack w-full text-left text-on-surface text-xs">
            <thead>
              <tr className="text-outline uppercase text-xs bg-surface-container-lowest/50 border-b border-surface-container-high">
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Plan Category</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Settlement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filtered.map((txn) => (
                <tr key={txn.id} className="hover:bg-surface-container/60 transition-colors">
                  <td data-label="Invoice No" className="py-3 px-4 font-mono text-secondary font-semibold">
                    {txn.invoiceNo}
                  </td>
                  <td data-label="Member" className="py-3 px-4">
                    <div className="font-medium text-on-surface">{txn.memberName}</div>
                    <div className="text-xs text-outline">{txn.memberEmail}</div>
                  </td>
                  <td data-label="Plan Category" className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-xs font-semibold">
                      {txn.planCategory}
                    </span>
                  </td>
                  <td data-label="Amount" className="py-3 px-4 font-sora text-sm font-semibold text-on-surface">
                    ₹{txn.amount.toLocaleString('en-IN')}
                  </td>
                  <td data-label="Mode" className="py-3 px-4 text-on-surface-variant">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-secondary text-base">
                        {txn.paymentMode.includes('UPI')
                          ? 'qr_code_2'
                          : txn.paymentMode.includes('Cash')
                          ? 'payments'
                          : 'credit_card'}
                      </span>
                      <span>{txn.paymentMode}</span>
                    </div>
                  </td>
                  <td data-label="Timestamp" className="py-3 px-4 font-mono text-[0.75rem] text-outline">
                    {txn.timestamp}
                  </td>
                  <td data-label="" className="py-3 px-4 text-right">
                    {txn.status === 'PAID' ? (
                      <button
                        onClick={() => setSelectedReceipt(txn)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-tertiary-container/20 hover:bg-tertiary-container/35 text-tertiary text-xs font-bold border border-tertiary/30 cursor-pointer transition-colors"
                        title="View Invoice"
                      >
                        <span className="material-symbols-outlined text-sm">print</span>
                        <span>Invoice</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkPaid(txn.id)}
                        disabled={busyPaidId === txn.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-error-container/50 hover:bg-error-container text-on-error-container text-xs font-bold border border-error/40 cursor-pointer transition-colors shadow-[0_0_8px_rgba(255,180,171,0.2)] disabled:opacity-50"
                      >
                        {busyPaidId === txn.id ? (
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                        )}
                        <span>{busyPaidId === txn.id ? 'Saving...' : 'Collect Cash'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-14 px-4 text-center">
                    {transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-2xl">receipt_long</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">No payments recorded yet</p>
                          <p className="text-xs text-outline mt-1">
                            Record a cash, UPI, or card payment to generate official invoices and WhatsApp receipts.
                          </p>
                        </div>
                        <button
                          onClick={openManualModal}
                          className="px-3.5 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold cursor-pointer transition-colors mt-2"
                        >
                          + Record First Payment
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-outline">
                        <span className="material-symbols-outlined text-2xl block mb-1">filter_alt_off</span>
                        No payments found for the &ldquo;{filterMode}&rdquo; filter.
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Payment Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-surface-container-low border border-secondary/40 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <h3 className="font-sora text-sm font-semibold text-on-surface">
                Record Payment
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-outline mb-1">Member</label>
                <select
                  required
                  value={memberId}
                  onChange={(e) => handleSelectMember(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-on-surface focus:outline-none focus:border-secondary"
                >
                  <option value="">Select a member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.planName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-outline mb-1">
                  Amount (₹ INR)
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-outline mb-1">
                  Payment Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as PaymentMode)
                  }
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-on-surface focus:outline-none"
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
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container font-bold disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submittingPayment && (
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  )}
                  {submittingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-surface-container-low border border-secondary/40 rounded-xl p-6 text-xs text-on-surface space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div>
                <h3 className="font-sora text-base font-bold text-on-surface">
                  TAX INVOICE / RECEIPT
                </h3>
                <p className="text-xs text-outline">
                  {gym.name}{gym.gstNumber ? ` · GSTIN ${gym.gstNumber}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-outline hover:text-on-surface"
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
