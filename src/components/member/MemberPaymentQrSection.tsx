'use client';

import React, { useState } from 'react';
import { inr } from '@/lib/format';

interface MemberPaymentQrSectionProps {
  gymName: string;
  upiId?: string | null;
  paymentQrUrl?: string | null;
  pendingDue?: number;
}

export const MemberPaymentQrSection: React.FC<MemberPaymentQrSectionProps> = ({
  gymName,
  upiId,
  paymentQrUrl,
  pendingDue = 0,
}) => {
  const [copied, setCopied] = useState(false);

  const hasUpi = Boolean(upiId || paymentQrUrl);
  const effectiveQr =
    paymentQrUrl ||
    (upiId
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
          `upi://pay?pa=${upiId}&pn=${gymName}${pendingDue > 0 ? `&am=${pendingDue}` : ''}&cu=INR`
        )}`
      : null);

  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="rounded-2xl border border-secondary/40 bg-surface-container-low p-6 space-y-4 shadow-[0_0_25px_rgba(123,208,255,0.12)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-2xl">qr_code_2</span>
          <div>
            <h3 className="font-sora text-base font-bold text-on-surface">Gym UPI Payment &amp; QR</h3>
            <p className="text-xs text-outline">Scan to pay membership fees &amp; dues</p>
          </div>
        </div>
        {pendingDue > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-error/15 text-error border border-error/30 text-xs font-bold">
            {inr(pendingDue)} Due
          </span>
        )}
      </div>

      {hasUpi ? (
        <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
          {/* QR Image */}
          {effectiveQr && (
            <div className="p-3 bg-white rounded-2xl shadow-md border border-surface-container-high shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={effectiveQr}
                alt={`${gymName} UPI QR`}
                className="w-36 h-36 object-contain"
              />
            </div>
          )}

          <div className="space-y-2.5 text-center sm:text-left flex-1 min-w-0">
            {upiId && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-outline block">Gym Official UPI ID</span>
                <div className="flex items-center gap-2 justify-center sm:justify-start mt-0.5">
                  <span className="font-mono text-xs font-bold text-secondary select-all bg-surface-container px-2.5 py-1 rounded-lg border border-surface-container-high inline-block">
                    {upiId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-[11px] text-outline hover:text-on-surface font-semibold underline cursor-pointer"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Open GPay, PhonePe, Paytm or any UPI app to scan and pay directly to <b>{gymName}</b>.
            </p>

            {upiId && (
              <a
                href={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(gymName)}${
                  pendingDue > 0 ? `&am=${pendingDue}` : ''
                }&cu=INR`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-[#001f28] font-bold text-xs shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                <span>Pay with UPI App</span>
              </a>
            )}
          </div>
        </div>
      ) : (
        /* Fallback if owner hasn't configured UPI yet */
        <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high text-xs text-on-surface space-y-2">
          <div className="flex items-center gap-2 text-outline">
            <span className="material-symbols-outlined text-base">info</span>
            <span className="font-semibold">UPI QR Not Yet Uploaded</span>
          </div>
          <p className="text-on-surface-variant leading-relaxed">
            Your gym owner has not added their UPI ID or QR code in Settings yet. You can complete your membership payment directly at the reception desk of <b>{gymName}</b>.
          </p>
        </div>
      )}
    </section>
  );
};
