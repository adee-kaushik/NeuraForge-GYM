'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckInLog, Member } from '../types';
import type { ScanCheckInResult } from '@/actions/attendance';

interface AttendanceViewProps {
  checkIns: CheckInLog[];
  members: Member[];
  onMarkPresent: (member: Member) => Promise<void> | void;
  onCheckInByCode?: (code: string) => Promise<ScanCheckInResult>;
}

type ModeTab = 'search' | 'qr-scanner' | 'biometric';

interface ScanFeedback {
  status: 'GRANTED' | 'DENIED' | 'ALREADY_PRESENT';
  name: string;
  memberCode: string;
  planName?: string;
  daysLeft?: number;
  message?: string;
  timestamp: string;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  checkIns,
  members,
  onMarkPresent,
  onCheckInByCode,
}) => {
  const [activeTab, setActiveTab] = useState<ModeTab>('search');

  // Search mode state
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Scanner mode state
  const [scanCode, setScanCode] = useState('');
  const [scanningBusy, setScanningBusy] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Biometric mode state
  const [bioId, setBioId] = useState('');
  const [bioBusy, setBioBusy] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const q = query.trim().toLowerCase();
  const results = q
    ? members.filter((m) => m.name.toLowerCase().includes(q) || m.phone.includes(q)).slice(0, 5)
    : [];

  const handleMarkPresent = async (m: Member) => {
    setBusyId(m.id);
    await onMarkPresent(m);
    setBusyId(null);
  };

  // Process code from QR or Barcode scanner
  const handleProcessCode = async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed || !onCheckInByCode) return;

    setScanningBusy(true);
    const res = await onCheckInByCode(trimmed);
    setScanningBusy(false);

    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if ('error' in res) {
      const isAlready = res.error.toLowerCase().includes('already marked');
      setFeedback({
        status: isAlready ? 'ALREADY_PRESENT' : 'DENIED',
        name: res.memberName || trimmed,
        memberCode: trimmed,
        message: res.error,
        timestamp: nowTime,
      });
    } else {
      setFeedback({
        status: 'GRANTED',
        name: res.member.name,
        memberCode: res.member.memberCode,
        planName: res.member.planName,
        daysLeft: res.member.daysLeft,
        message: 'Floor access granted. Check-in recorded.',
        timestamp: nowTime,
      });
      setScanCode('');
    }
  };

  // Start Camera QR Scanner
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      alert('Camera access was not permitted or is unavailable on this device.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleBiometricPunch = async (idToPunch: string) => {
    const val = idToPunch.trim();
    if (!val || !onCheckInByCode) return;
    setBioBusy(true);
    await handleProcessCode(val);
    setBioBusy(false);
    setBioId('');
  };

  const copyApiUrl = () => {
    const url = `${window.location.origin}/api/attendance/biometric`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-2xl">fact_check</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Floor Attendance</h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Real-time gym check-ins via QR codes, biometric punches, or fast search
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center gap-1 bg-surface-container-low p-1.5 rounded-2xl border border-surface-container-high">
          <button
            onClick={() => setActiveTab('search')}
            className={`min-h-[42px] px-2 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-secondary text-white shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base sm:text-lg">search</span>
            <span>Search</span>
          </button>
          <button
            onClick={() => setActiveTab('qr-scanner')}
            className={`min-h-[42px] px-2 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'qr-scanner'
                ? 'bg-[#25D366] text-black shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base sm:text-lg">qr_code_scanner</span>
            <span>QR Scan</span>
          </button>
          <button
            onClick={() => setActiveTab('biometric')}
            className={`min-h-[42px] px-2 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'biometric'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base sm:text-lg">fingerprint</span>
            <span>Biometrics</span>
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="p-8 rounded-xl bg-surface-container-low border border-surface-container-high text-center">
          <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary mx-auto mb-3">
            <span className="material-symbols-outlined text-2xl">how_to_reg</span>
          </div>
          <h3 className="font-sora text-sm font-semibold text-on-surface">No Members Registered</h3>
          <p className="text-xs text-outline mt-1 max-w-md mx-auto">
            Add members to your gym from the Members tab to start recording check-ins and tracking floor visits.
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: MANUAL SEARCH */}
          {activeTab === 'search' && (
            <div className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
              <h2 className="font-sora text-sm font-semibold text-on-surface">Quick Member Search</h2>
              <div className="relative max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search member by name or phone number..."
                  className="w-full bg-surface-container-lowest pl-9 pr-3 py-2 rounded-lg text-xs text-on-surface border border-surface-container-high focus:border-secondary focus:outline-none"
                />
              </div>

              {q && results.length === 0 && <p className="text-xs text-outline">No member found.</p>}

              {results.map((m) => {
                const alreadyIn = checkIns.some((c) => c.memberId === m.id);
                const expired = m.status === 'expired';
                const isBusy = busyId === m.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30 shrink-0">
                        {m.avatarInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-on-surface truncate">{m.name}</div>
                        <div className="text-xs text-outline">
                          {m.memberCode} · {m.planDuration} · {expired ? 'Expired' : `${m.daysLeft} days left`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkPresent(m)}
                      disabled={alreadyIn || expired || isBusy}
                      className="px-4 py-1.5 rounded-lg bg-[#4edea3] hover:bg-[#34c78b] text-[#002113] text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {isBusy && (
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      )}
                      {expired ? 'Renew first' : alreadyIn ? 'Already present' : isBusy ? 'Marking...' : 'Mark Present'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: QR CODE & BARCODE SCANNER */}
          {activeTab === 'qr-scanner' && (
            <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-[#25D366]/40 flex flex-col gap-5 shadow-[0_0_30px_rgba(37,211,102,0.12)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-sora text-sm font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#25D366] text-xl">qr_code_scanner</span>
                    <span>QR Pass & Barcode Gun Terminal</span>
                  </h2>
                  <p className="text-xs text-outline mt-0.5">
                    Scan member QR pass on their phone or plug in a USB Barcode gun
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!cameraActive ? (
                    <button
                      onClick={startCamera}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs font-bold border border-secondary/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">videocam</span>
                      <span>Start Camera</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="px-3.5 py-1.5 rounded-lg bg-error-container/40 text-error hover:bg-error-container text-xs font-bold border border-error/40 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">videocam_off</span>
                      <span>Stop Camera</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Camera Preview Box */}
              {cameraActive && (
                <div className="relative w-full max-w-sm mx-auto h-60 bg-black rounded-xl overflow-hidden border-2 border-[#25D366] flex items-center justify-center shadow-[0_0_24px_rgba(37,211,102,0.3)]">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  <div className="absolute inset-x-8 inset-y-8 border-2 border-dashed border-[#25D366] rounded-lg pointer-events-none flex items-center justify-center">
                    <div className="w-full h-0.5 bg-[#25D366] shadow-[0_0_8px_#25D366] animate-pulse"></div>
                  </div>
                  <span className="absolute bottom-2 text-[10px] bg-black/70 px-2 py-0.5 rounded text-[#25D366] font-mono">
                    Align Member QR code inside box
                  </span>
                </div>
              )}

              {/* Barcode Gun / Keyboard Input form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessCode(scanCode);
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl"
              >
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#25D366] text-lg">
                    barcode_reader
                  </span>
                  <input
                    type="text"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Scan QR or punch code (e.g. MEM-001)..."
                    autoFocus
                    className="w-full bg-surface-container-lowest pl-9 pr-3 py-2.5 rounded-lg text-xs font-mono text-on-surface border border-surface-container-high focus:border-[#25D366] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={scanningBusy || !scanCode.trim()}
                  className="px-5 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#1ebc57] text-[#002113] font-bold text-xs shadow-[0_0_14px_rgba(37,211,102,0.3)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  {scanningBusy && (
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  )}
                  <span>{scanningBusy ? 'Processing...' : 'Verify Entry'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: BIOMETRIC TERMINAL & HARDWARE PUNCH HUB */}
          {activeTab === 'biometric' && (
            <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-primary/40 flex flex-col gap-6 shadow-[0_0_30px_rgba(148,125,255,0.12)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-sora text-sm font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">fingerprint</span>
                    <span>Biometric Device Console</span>
                  </h2>
                  <p className="text-xs text-outline mt-0.5">
                    Connects eSSL, ZKTeco, Mantra biometric attendance machines directly to NeuraForge
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Punch Keypad Terminal */}
                <div className="lg:col-span-5 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-outline block">
                    Biometric Punch Terminal
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bioId}
                      onChange={(e) => setBioId(e.target.value)}
                      placeholder="Enter Member Code or Biometric ID..."
                      className="flex-1 bg-surface-container px-3 py-2 rounded-lg text-xs font-mono text-on-surface border border-surface-container-high focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={() => handleBiometricPunch(bioId)}
                      disabled={bioBusy || !bioId.trim()}
                      className="h-10 px-5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
                    >
                      {bioBusy && (
                        <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                      )}
                      <span>Punch</span>
                    </button>
                  </div>

                  {/* Quick-punch suggestions from active roster */}
                  <div className="pt-2">
                    <span className="text-[11px] text-outline block mb-1.5">Quick punch members:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {members.slice(0, 6).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleBiometricPunch(m.memberCode)}
                          className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-[11px] font-mono text-secondary border border-surface-container-high cursor-pointer transition-colors"
                        >
                          {m.memberCode} ({m.name.split(' ')[0]})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hardware Webhook Integration Info */}
                <div className="lg:col-span-7 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-secondary">lan</span>
                      <span>Hardware Integration Webhook</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-tertiary/15 text-tertiary text-[10px] font-bold border border-tertiary/30">
                      LIVE API ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-outline">
                    Your local biometric machine sync service (eSSL eTimeTrackLite / ZK BioSecurity) can push punch logs directly:
                  </p>

                  <div className="p-2.5 rounded-lg bg-surface-container font-mono text-xs flex items-center justify-between gap-2 border border-surface-container-high">
                    <span className="truncate text-secondary">POST /api/attendance/biometric</span>
                    <button
                      onClick={copyApiUrl}
                      className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-[10px] font-sans font-bold text-on-surface shrink-0 cursor-pointer"
                    >
                      {copiedUrl ? 'Copied!' : 'Copy Full URL'}
                    </button>
                  </div>

                  <div className="text-[11px] text-outline space-y-1">
                    <p className="font-semibold text-on-surface-variant">JSON Payload Format:</p>
                    <pre className="p-2 bg-surface-container rounded text-[10px] text-secondary font-mono overflow-x-auto">
{`{
  "gymSlug": "your-gym-slug",
  "identifier": "MEM-001",
  "timestamp": "2026-10-08T01:00:00Z"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REAL-TIME SCAN / BIOMETRIC ACCESS FEEDBACK CARD */}
          {feedback && (
            <div
              className={`p-4 rounded-xl border transition-all animate-in fade-in slide-in-from-top-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                feedback.status === 'GRANTED'
                  ? 'bg-tertiary/10 border-tertiary shadow-[0_0_24px_rgba(78,222,163,0.3)]'
                  : feedback.status === 'ALREADY_PRESENT'
                  ? 'bg-secondary/10 border-secondary shadow-[0_0_24px_rgba(123,208,255,0.2)]'
                  : 'bg-error/10 border-error shadow-[0_0_24px_rgba(255,180,171,0.25)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    feedback.status === 'GRANTED'
                      ? 'bg-tertiary text-[#002113]'
                      : feedback.status === 'ALREADY_PRESENT'
                      ? 'bg-secondary text-[#001f28]'
                      : 'bg-error text-[#410002]'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {feedback.status === 'GRANTED'
                      ? 'check_circle'
                      : feedback.status === 'ALREADY_PRESENT'
                      ? 'verified'
                      : 'cancel'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sora text-sm font-bold text-on-surface">{feedback.name}</span>
                    <span className="font-mono text-xs text-outline">({feedback.memberCode})</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        feedback.status === 'GRANTED'
                          ? 'bg-tertiary/20 text-tertiary border border-tertiary/40'
                          : feedback.status === 'ALREADY_PRESENT'
                          ? 'bg-secondary/20 text-secondary border border-secondary/40'
                          : 'bg-error/20 text-error border border-error/40'
                      }`}
                    >
                      {feedback.status === 'GRANTED'
                        ? 'ACCESS GRANTED'
                        : feedback.status === 'ALREADY_PRESENT'
                        ? 'ALREADY PRESENT'
                        : 'ACCESS DENIED'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {feedback.message} {feedback.planName ? `· Plan: ${feedback.planName}` : ''}{' '}
                    {feedback.daysLeft !== undefined ? `(${feedback.daysLeft} days remaining)` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                <span className="text-[11px] font-mono text-outline">{feedback.timestamp}</span>
                <button
                  onClick={() => setFeedback(null)}
                  className="p-1 rounded text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Today's attendance log table */}
      <div className="rounded-xl bg-surface-container-low border border-surface-container-high overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <div className="p-4 border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-pulse"></span>
            <h2 className="font-sora text-sm font-semibold text-on-surface">
              Today&apos;s Floor Attendance ({checkIns.length})
            </h2>
          </div>
          <span className="text-xs text-outline">Sorted by most recent check-in</span>
        </div>
        <div className="overflow-x-auto">
          <table className="stack w-full text-left text-on-surface text-xs">
            <thead>
              <tr className="text-outline uppercase text-xs bg-surface-container-lowest border-b border-surface-container-high">
                <th className="py-2.5 px-4">Member</th>
                <th className="py-2.5 px-4">Plan</th>
                <th className="py-2.5 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {checkIns.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container/40 transition-colors">
                  <td data-label="Member" className="py-3 px-4 font-semibold text-on-surface">
                    {log.memberName}
                  </td>
                  <td data-label="Plan" className="py-3 px-4 text-on-surface-variant">
                    <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-xs font-semibold">
                      {log.planDuration}
                    </span>
                  </td>
                  <td data-label="Time" className="py-3 px-4 text-on-surface-variant font-mono">
                    {log.time}
                  </td>
                </tr>
              ))}
              {checkIns.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 px-4 text-center text-outline">
                    <span className="material-symbols-outlined text-2xl block mb-1 text-outline/50">event_busy</span>
                    No one has checked in yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
