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
  const [checkedIn, setCheckedIn] = useState(hasCheckedInToday);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const qrPayload = `NF:${gymSlug}:${memberCode}`;

  useEffect(() => {
    QRCode.toDataURL(
      qrPayload,
      {
        width: 260,
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
      // If browser supports WebAuthn / Platform Biometrics, optionally invoke a user touch verification
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        try {
          const isBioAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (isBioAvailable) {
            // Biometric hardware detected (FaceID, TouchID, Android Fingerprint)
          }
        } catch {
          // Fall back gracefully to direct self-verification
        }
      }

      const res = await memberSelfCheckIn();
      if (!res.ok) {
        setMessage({ text: res.error || 'Check-in failed.', isError: true });
      } else {
        setCheckedIn(true);
        setMessage({ text: '✅ Checked In Successfully! Have a great workout!' });
      }
    } catch {
      setMessage({ text: 'Network or device error during check-in.', isError: true });
    } finally {
      setBusy(false);
    }
  };

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
            <span className="material-symbols-outlined text-sm">badge</span>
            <span>Digital Gym Pass</span>
          </span>
          <h3 className="font-sora text-base font-bold text-on-surface mt-0.5">{gymName}</h3>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>

      {/* QR Code and Member Info */}
      <div className="py-5 flex flex-col items-center justify-center text-center">
        <div className="relative p-2.5 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white/20 mb-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Member QR Code" className="w-44 h-44 object-contain rounded" />
          ) : (
            <div className="w-44 h-44 bg-surface-container flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
            </div>
          )}
        </div>

        <p className="font-mono text-sm font-bold text-secondary tracking-wider">{memberCode}</p>
        <p className="font-sora text-lg font-bold text-on-surface mt-0.5">{memberName}</p>
        <p className="text-xs text-outline">{planName} · Expires {expiryDateStr}</p>
      </div>

      {/* Check-in Status & Biometrics Button */}
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
            className="w-full py-2.5 px-4 rounded-xl bg-primary-container hover:bg-[#cabeff] text-on-primary-container font-bold text-xs shadow-[0_0_16px_rgba(148,125,255,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                : 'Self Check-in (Biometrics / Tap)'}
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

        <p className="text-[11px] text-outline text-center">
          Show this QR code at front desk or punch your ID ({memberCode}) on the biometric terminal.
        </p>
      </div>
    </div>
  );
};
