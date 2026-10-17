'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { GymConfig } from '@/config/gym';

interface FrontDeskQrModalProps {
  gym: GymConfig;
  isOpen: boolean;
  onClose: () => void;
  pendingCount?: number;
  onOpenPendingList?: () => void;
}

export const FrontDeskQrModal: React.FC<FrontDeskQrModalProps> = ({
  gym,
  isOpen,
  onClose,
  pendingCount = 0,
  onOpenPendingList,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://neuraforge.com';
  const joinUrl = `${origin}/join/${gym.slug}`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(
      joinUrl,
      {
        width: 320,
        margin: 1,
        color: {
          dark: '#0a0a0c',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [joinUrl, isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyUpi = () => {
    if (!gym.upiId) return;
    navigator.clipboard.writeText(gym.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${gym.slug}-front-desk-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-surface-container-low border border-secondary/40 rounded-2xl shadow-[0_0_60px_rgba(123,208,255,0.25)] overflow-hidden flex flex-col my-auto max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-xl text-secondary">qr_code_2</span>
            <div>
              <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                Front Desk Self-Enrollment QR
              </h3>
              <p className="text-[11px] text-outline">
                Stick on front desk or share with prospective members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer rounded-lg hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Pending Approvals Notice if any */}
          {pendingCount > 0 && (
            <div className="p-3 rounded-xl bg-secondary/15 border border-secondary/40 flex items-center justify-between gap-3 text-xs animate-pulse">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-secondary">notifications_active</span>
                <span className="font-bold text-secondary">
                  {pendingCount} member{pendingCount > 1 ? 's' : ''} recently enrolled via QR and waiting for approval!
                </span>
              </div>
              {onOpenPendingList && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPendingList();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-secondary text-[#001f28] font-bold text-xs cursor-pointer hover:opacity-90 shrink-0"
                >
                  Review
                </button>
              )}
            </div>
          )}

          {/* PRINTABLE STANDEE POSTER CONTAINER */}
          <div
            ref={posterRef}
            id="printable-front-desk-standee"
            className="relative bg-gradient-to-b from-[#121624] via-[#0c101d] to-[#070911] text-white p-6 sm:p-7 rounded-2xl border-2 border-secondary/50 shadow-2xl text-center space-y-4 overflow-hidden"
          >
            {/* Background Glow / Accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-[#4edea3]"></div>
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Poster Header */}
            <div>
              <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-secondary/20 text-secondary border border-secondary/40 mb-1.5">
                ⚡ Self-Service Front Desk Check-in
              </span>
              <h2 className="font-sora text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                {gym.name}
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Scan to Register, Choose Plan &amp; Activate Biometrics
              </p>
            </div>

            {/* QR Code Presentation Box */}
            <div className="relative inline-block mx-auto p-3.5 bg-white rounded-2xl shadow-[0_0_35px_rgba(123,208,255,0.3)] border-4 border-slate-900">
              {/* Corner scan target guides */}
              <div className="absolute -top-2 -left-2 w-5 h-5 border-t-3 border-l-3 border-secondary rounded-tl"></div>
              <div className="absolute -top-2 -right-2 w-5 h-5 border-t-3 border-r-3 border-secondary rounded-tr"></div>
              <div className="absolute -bottom-2 -left-2 w-5 h-5 border-b-3 border-l-3 border-secondary rounded-bl"></div>
              <div className="absolute -bottom-2 -right-2 w-5 h-5 border-b-3 border-r-3 border-secondary rounded-br"></div>

              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Scan to Join ${gym.name}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain block mx-auto"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-slate-100 text-slate-400">
                  <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
                </div>
              )}
            </div>

            {/* 3 Simple Steps */}
            <div className="grid grid-cols-3 gap-2 text-left pt-2">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-secondary block">STEP 1</span>
                <p className="text-[11px] font-bold text-white leading-tight mt-0.5">
                  Scan QR with Camera
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-secondary block">STEP 2</span>
                <p className="text-[11px] font-bold text-white leading-tight mt-0.5">
                  Fill Details &amp; Plan
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-[#4edea3] block">STEP 3</span>
                <p className="text-[11px] font-bold text-white leading-tight mt-0.5">
                  Pay via UPI &amp; Enter!
                </p>
              </div>
            </div>

            {/* Owner UPI Badge */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between text-left">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                  Accepted Payments: GPay · PhonePe · Paytm · BHIM
                </span>
                <span className="text-xs font-mono font-bold text-[#4edea3]">
                  UPI: {gym.upiId || 'Available on QR scan'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/40">
                Instant UPI
              </span>
            </div>

            <p className="text-[10px] text-slate-400">
              Staff will immediately verify your payment &amp; enroll your biometric fingerprint pass.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Print Standee */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-secondary text-[#001f28] font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 cursor-pointer active:scale-95 transition-all"
                title="Print ready standee for desk"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>Print Standee</span>
              </button>

              {/* Download QR Image */}
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex items-center gap-1.5 border border-surface-container-high cursor-pointer active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span>Download QR Image</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Copy URL */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary font-bold text-xs flex items-center gap-1.5 border border-surface-container-high cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-base">
                  {copiedLink ? 'check' : 'content_copy'}
                </span>
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>

              {/* Open Public Page in new tab */}
              <a
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high cursor-pointer transition-colors"
                title="Test Member Join Page"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            </div>
          </div>

          {/* Direct URL Preview */}
          <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high flex items-center justify-between text-xs">
            <span className="text-outline truncate max-w-sm font-mono text-[11px]">{joinUrl}</span>
            <span className="text-[10px] text-secondary font-bold shrink-0 ml-2">Public Self-Join Link</span>
          </div>
        </div>
      </div>
    </div>
  );
};
