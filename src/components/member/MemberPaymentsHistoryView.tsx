'use client';

import React, { useState } from 'react';
import { inr } from '@/lib/format';
import { MemberPaymentQrSection } from './MemberPaymentQrSection';

export interface MemberPaymentItem {
  id: string;
  amount: number;
  gstAmount: number;
  mode: string;
  status: string;
  invoiceNo: string;
  planName: string;
  dateStr: string;
  timeStr: string;
}

interface MemberPaymentsHistoryViewProps {
  gymName: string;
  upiId?: string | null;
  paymentQrUrl?: string | null;
  totalPaid: number;
  pendingDue: number;
  payments: MemberPaymentItem[];
}

export const MemberPaymentsHistoryView: React.FC<MemberPaymentsHistoryViewProps> = ({
  gymName,
  upiId,
  paymentQrUrl,
  totalPaid,
  pendingDue,
  payments,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<MemberPaymentItem | null>(null);

  const filtered = payments.filter((p) => {
    if (filter === 'PAID') return p.status === 'PAID';
    if (filter === 'PENDING') return p.status === 'PENDING';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-sora text-lg font-bold text-on-surface">Payment History</h2>
        <p className="text-xs text-outline">All invoices, GST receipts, and payment transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-4">
          <p className="text-[11px] uppercase tracking-wider text-outline font-bold">Total Paid</p>
          <p className="font-sora text-xl font-bold mt-1 text-tertiary">{inr(totalPaid)}</p>
          <span className="text-[10px] text-outline mt-0.5 block">{payments.filter((p) => p.status === 'PAID').length} paid receipts</span>
        </div>

        <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-4">
          <p className="text-[11px] uppercase tracking-wider text-outline font-bold">Pending Dues</p>
          <p className={`font-sora text-xl font-bold mt-1 ${pendingDue > 0 ? 'text-error' : 'text-tertiary'}`}>
            {inr(pendingDue)}
          </p>
          <span className="text-[10px] text-outline mt-0.5 block">
            {pendingDue > 0 ? 'Action required' : 'No dues pending'}
          </span>
        </div>
      </div>

      {/* Always-accessible Gym UPI QR section */}
      <MemberPaymentQrSection
        gymName={gymName}
        upiId={upiId}
        paymentQrUrl={paymentQrUrl}
        pendingDue={pendingDue}
      />

      {/* Filter Tabs */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-outline">
          Transaction Records ({filtered.length})
        </h3>
        <div className="flex rounded-lg bg-surface-container p-0.5 border border-surface-container-high text-xs">
          {(['ALL', 'PAID', 'PENDING'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'PAID' ? 'Paid' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const isPaid = item.status === 'PAID';
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-surface-container-high bg-surface-container-low p-4 space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-sora text-base font-bold text-on-surface block">
                      {inr(item.amount)}
                    </span>
                    <span className="text-[11px] font-medium text-secondary">{item.planName}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${
                      isPaid
                        ? 'bg-tertiary/15 text-tertiary border-tertiary/30'
                        : 'bg-error/15 text-error border-error/30'
                    }`}
                  >
                    {isPaid ? 'PAID' : 'PENDING'}
                  </span>
                </div>

                <div className="pt-2 border-t border-surface-container-high/60 grid grid-cols-2 gap-2 text-[11px] text-outline font-mono">
                  <div>
                    <span className="block text-[10px] uppercase text-outline">Invoice No:</span>
                    <span className="text-on-surface font-bold">{item.invoiceNo}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-outline">Mode:</span>
                    <span className="text-on-surface font-bold">{item.mode}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-outline">Date &amp; Time:</span>
                    <span className="text-on-surface">
                      {item.dateStr} · {item.timeStr}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-outline">GST Included:</span>
                    <span className="text-on-surface font-bold">{inr(item.gstAmount)}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <button
                    onClick={() => setSelectedReceipt(item)}
                    className="text-[11px] font-bold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">receipt</span>
                    <span>View Receipt Details</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-container-highest p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-outline text-3xl">receipt_long</span>
            <p className="text-xs font-bold text-on-surface">No transaction records found</p>
            <p className="text-[11px] text-outline">
              Your payments and invoices will appear here once recorded by the gym front desk.
            </p>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-surface-container-low border border-secondary/40 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">receipt_long</span>
                <div>
                  <h3 className="font-sora text-sm font-bold text-on-surface">Payment Receipt</h3>
                  <p className="text-[10px] text-outline font-mono">{selectedReceipt.invoiceNo}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-outline hover:text-on-surface p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-2">
                <div className="flex justify-between">
                  <span className="text-outline">Gym:</span>
                  <span className="font-bold text-on-surface">{gymName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Plan:</span>
                  <span className="font-bold text-secondary">{selectedReceipt.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Date:</span>
                  <span className="text-on-surface">{selectedReceipt.dateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Payment Mode:</span>
                  <span className="text-on-surface font-bold">{selectedReceipt.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Status:</span>
                  <span className={`font-bold ${selectedReceipt.status === 'PAID' ? 'text-tertiary' : 'text-error'}`}>
                    {selectedReceipt.status}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container space-y-1.5 border border-surface-container-high">
                <div className="flex justify-between text-outline">
                  <span>Base Amount:</span>
                  <span>{inr(selectedReceipt.amount - selectedReceipt.gstAmount)}</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>GST Tax (Included):</span>
                  <span>{inr(selectedReceipt.gstAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-on-surface pt-1 border-t border-surface-container-high">
                  <span>Total Paid:</span>
                  <span className="text-secondary">{inr(selectedReceipt.amount)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs cursor-pointer hover:opacity-90 transition-all"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
