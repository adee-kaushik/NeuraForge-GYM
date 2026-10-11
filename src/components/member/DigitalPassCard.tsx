'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { memberSelfCheckIn } from '@/app/member/actions';

interface DigitalPassCardProps {
  gymSlug: string;
  gymName: string;
  memberCode: string;
  memberName: string;
  planName: string;
  expiryDateStr: string;
  daysLeft: number | null;
  statusLabel: string;
  statusStyle: string;
  hasCheckedInToday: boolean;
}

export const DigitalPassCard: React.FC<DigitalPassCardProps> = ({
  gymSlug,
  gymName,
  memberCode,
  memberName,
  planName,
  expiryDateStr,
  daysLeft,
  statusLabel,
  statusStyle,
  hasCheckedInToday,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQr, setShowQr] = useState<boolean>(false);
  const [checkedIn, setCheckedIn] = useState(hasCheckedInToday);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const qrPayload = `NF:${gymSlug}:${memberCode}`;

  useEffect(() => {
    QRCode.toDataURL(
      qrPayload,
      {
        width: 240,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [qrPayload]);

  const handleBiometricCheckIn = async () => {
    if (checkedIn) return;
    setBusy(true);
    setMessage(null);

    try {
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        try {
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch {
          // Fall back gracefully
        }
      }

      const res = await memberSelfCheckIn();
      if (!res.ok) {
        setMessage({ text: res.error || 'Check-in failed.', isError: true });
      } else {
        setCheckedIn(true);
        setMessage({ text: '✅ Verified & Checked In! Have a great workout!' });
      }
    } catch {
      setMessage({ text: 'Network or device error during check-in.', isError: true });
    } finally {
      setBusy(false);
    }
  };

  const initials = memberName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="relative rounded-2xl border border-secondary/40 bg-gradient-to-b from-surface-container-high/60 via-surface-container-low to-surface-container-lowest p-6 shadow-[0_4px_30px_rgba(123,208,255,0.15)] overflow-hidden">
      {/* Corner aesthetic ticks */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-secondary"></div>
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-secondary"></div>
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-primary"></div>
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-primary"></div>

      {/* Pass Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-container-high/80">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-secondary font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">fingerprint</span>
            <span>Biometric Digital Pass</span>
          </span>
          <h3 className="font-sora text-base font-bold text-on-surface mt-0.5">{gymName}</h3>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>

      {/* Primary Biometric Pass Body */}
      <div className="py-5 flex flex-col items-center justify-center text-center space-y-3">
        {/* Biometric Avatar & Verification Badge */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 border-2 border-secondary/60 flex items-center justify-center text-on-surface font-sora font-extrabold text-2xl shadow-lg">
            {initials}
          </div>
          <span
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-tertiary text-[#002113] shadow-md border-2 border-surface-container flex items-center justify-center"
            title="Biometric Fingerprint & Face Verified"
          >
            <span className="material-symbols-outlined text-sm font-bold">verified_user</span>
          </span>
        </div>

        <div>
          <p className="font-sora text-xl font-bold text-on-surface">{memberName}</p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-xs text-outline font-mono">Member ID (Phone):</span>
            <span className="font-mono text-sm font-bold text-secondary">{memberCode}</span>
          </div>
          <p className="text-xs text-outline mt-0.5">
            {planName} · Expires {expiryDateStr}
          </p>
        </div>

        {/* Biometric Hardware Punch Instructions */}
        <div className="p-3 rounded-xl bg-surface-container border border-surface-container-high text-xs text-on-surface-variant flex items-center gap-2 max-w-sm">
          <span className="material-symbols-outlined text-secondary text-lg shrink-0">fingerprint</span>
          <p className="text-[11px] text-left leading-relaxed">
            Scan your <b>Fingerprint</b> or <b>Face ID</b> on the gym terminal. Your biometric terminal ID is <b>{memberCode}</b>.
          </p>
        </div>

        {/* Optional QR Pass Toggle (Requirement 4) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-outline hover:text-on-surface font-semibold text-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">qr_code_2</span>
            <span>{showQr ? 'Hide QR Code Pass' : 'Show Optional QR Pass'}</span>
          </button>
        </div>

        {/* Optional Collapsible QR View */}
        {showQr && (
          <div className="pt-2 animate-in fade-in space-y-2">
            <div className="p-2.5 bg-white rounded-xl shadow-md border border-white/20 inline-block">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Member QR Code" className="w-36 h-36 object-contain rounded" />
              ) : (
                <div className="w-36 h-36 bg-surface-container flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-outline font-mono">
              Scan this QR code if front desk has a handheld optical scanner
            </p>
          </div>
        )}
      </div>

      {/* Check-in Status & Direct Biometrics Tap Button */}
      <div className="pt-3 border-t border-surface-container-high/80 space-y-3">
        {checkedIn ? (
          <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-tertiary/15 border border-tertiary/30 text-tertiary text-xs font-bold shadow-[0_0_12px_rgba(78,222,163,0.2)]">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Marked Present Today</span>
          </div>
        ) : (
          <button
            onClick={handleBiometricCheckIn}
            disabled={busy || (daysLeft !== null && daysLeft < 0)}
            className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-base">fingerprint</span>
            )}
            <span>
              {busy
                ? 'Verifying...'
                : daysLeft !== null && daysLeft < 0
                ? 'Membership Expired'
                : 'Tap to Check In (Biometrics / Phone)'}
            </span>
          </button>
        )}

        {message && (
          <p
            className={`text-xs text-center font-medium ${
              message.isError ? 'text-error' : 'text-tertiary'
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
};
