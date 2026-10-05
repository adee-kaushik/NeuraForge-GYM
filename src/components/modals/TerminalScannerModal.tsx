import React, { useState } from 'react';
import { Member, CheckInLog } from '../../types';

interface TerminalScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onNewCheckIn: (log: CheckInLog) => void;
}

export const TerminalScannerModal: React.FC<TerminalScannerModalProps> = ({
  isOpen,
  onClose,
  members,
  onNewCheckIn,
}) => {
  const [selectedGate, setSelectedGate] = useState<'Gate 1 (Turnstile)' | 'Gate 2 (Iron Zone)'>('Gate 1 (Turnstile)');
  const [activeScan, setActiveScan] = useState<{
    member: Member;
    status: 'GRANTED' | 'DENIED';
    temp: string;
    timestamp: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  const playBeep = (granted: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (granted) {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pleasant A5
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  const handleSimulateScan = (member: Member) => {
    setIsScanning(true);
    setActiveScan(null);

    setTimeout(() => {
      setIsScanning(false);
      const isGranted = member.status !== 'expired';
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const temp = (98.0 + Math.random() * 0.8).toFixed(1) + '°F';

      playBeep(isGranted);

      setActiveScan({
        member,
        status: isGranted ? 'GRANTED' : 'DENIED',
        temp,
        timestamp: timeStr,
      });

      if (isGranted) {
        onNewCheckIn({
          id: `CHK-${Date.now().toString().slice(-4)}`,
          memberId: member.id,
          memberName: member.name,
          rank: member.rank,
          planDuration: member.planDuration,
          time: timeStr,
          gate: selectedGate,
          status: 'GRANTED',
          temperature: temp,
        });
      }
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-surface-container-low border border-secondary/40 rounded-xl shadow-[0_0_50px_rgba(123,208,255,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Manhwa HUD top corners */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-secondary"></div>
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-secondary"></div>
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-primary"></div>

        {/* Modal Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center border border-secondary/40 shadow-[0_0_12px_rgba(123,208,255,0.3)]">
              <span className="material-symbols-outlined text-lg">sensors</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sora text-base font-semibold text-on-surface">
                  Tactical Gate Terminal Feeder
                </h3>
                <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
              </div>
              <p className="text-xs text-outline">
                eSSL SilkBio-101TC Biometric &amp; RFID Stream · Indiranagar Node
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Gate Selector Tabs */}
          <div className="flex items-center justify-between bg-surface-container-lowest p-1.5 rounded-lg border border-surface-container-high">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedGate('Gate 1 (Turnstile)')}
                className={`px-4 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  selectedGate === 'Gate 1 (Turnstile)'
                    ? 'bg-surface-container-high text-secondary shadow-[0_0_12px_rgba(123,208,255,0.25)] border border-secondary/40'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                Gate 1: Reception Turnstile
              </button>
              <button
                onClick={() => setSelectedGate('Gate 2 (Iron Zone)')}
                className={`px-4 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  selectedGate === 'Gate 2 (Iron Zone)'
                    ? 'bg-surface-container-high text-secondary shadow-[0_0_12px_rgba(123,208,255,0.25)] border border-secondary/40'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                Gate 2: Heavy Iron Zone
              </button>
            </div>
            <span className="text-[0.6875rem] font-mono text-tertiary px-2 py-0.5 rounded bg-tertiary-container/20 border border-tertiary/30">
              100% OPERATIONAL
            </span>
          </div>

          {/* Scanner Viewport Simulation */}
          <div className="relative h-64 bg-surface-container-lowest rounded-xl border border-surface-container-high overflow-hidden flex items-center justify-center">
            {/* Background Grid Pattern */}
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, #7bd0ff 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            ></div>

            {/* Target Reticle */}
            <div className="relative w-44 h-44 border border-secondary/30 rounded-lg flex items-center justify-center">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-secondary"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-secondary"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-secondary"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-secondary"></div>

              {/* Scanning Laser */}
              {isScanning && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#7bd0ff] to-transparent shadow-[0_0_16px_#7bd0ff] animate-bounce"></div>
              )}

              {/* Center status message */}
              <div className="text-center p-2">
                {isScanning ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-secondary animate-spin">
                      rotate_right
                    </span>
                    <span className="text-xs text-secondary font-bold tracking-widest uppercase">
                      Verifying Biometrics...
                    </span>
                  </div>
                ) : activeScan ? (
                  <div className="flex flex-col items-center gap-1.5 animate-in zoom-in-95">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        activeScan.status === 'GRANTED'
                          ? 'bg-tertiary-container/20 text-tertiary border border-tertiary'
                          : 'bg-error-container/30 text-error border border-error'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {activeScan.status === 'GRANTED' ? 'check' : 'close'}
                      </span>
                    </div>
                    <span
                      className={`font-sora text-sm font-bold tracking-wider ${
                        activeScan.status === 'GRANTED' ? 'text-tertiary' : 'text-error'
                      }`}
                    >
                      ACCESS {activeScan.status}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-outline">
                    <span className="material-symbols-outlined text-4xl text-secondary/40">
                      fingerprint
                    </span>
                    <span className="text-[0.6875rem] uppercase tracking-wider">
                      Ready for Biometric / RFID Pass
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Telemetry Stats */}
            <div className="absolute bottom-3 left-4 text-[0.6875rem] font-mono text-outline">
              FREQ: 13.56 MHz · ISO/IEC 14443
            </div>
            <div className="absolute bottom-3 right-4 text-[0.6875rem] font-mono text-secondary">
              STATUS: IDLE_LISTENING
            </div>
          </div>

          {/* Active Result Banner if verified */}
          {activeScan && (
            <div className="p-4 rounded-xl bg-surface-container border border-surface-container-highest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  {activeScan.member.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sora text-sm font-semibold text-on-surface">
                      {activeScan.member.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[0.6875rem] font-bold bg-primary/20 text-primary">
                      {activeScan.member.rank}
                    </span>
                  </div>
                  <div className="text-xs text-outline">
                    Tag: {activeScan.member.rfidTag} · Plan: {activeScan.member.planName} · Temp: {activeScan.temp}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-tertiary font-bold font-mono">
                  {activeScan.timestamp}
                </span>
                <p className="text-[0.6875rem] text-outline">{selectedGate}</p>
              </div>
            </div>
          )}

          {/* Test Check-in Buttons (Tap Member Card) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline">
                Simulate RFID Card Tap on Turnstile
              </span>
              <span className="text-[0.6875rem] text-secondary">Click any member to scan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {members.slice(0, 6).map((member) => (
                <button
                  key={member.id}
                  disabled={isScanning}
                  onClick={() => handleSimulateScan(member)}
                  className="p-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border border-surface-container-high hover:border-secondary/40 text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="font-semibold text-xs text-on-surface group-hover:text-secondary truncate">
                      {member.name}
                    </p>
                    <p className="text-[0.625rem] text-outline">{member.rfidTag}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[0.625rem] font-bold bg-primary/15 text-primary shrink-0">
                    {member.rank}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between">
          <span className="text-[0.6875rem] text-outline">
            Turnstile auto-unlock latency: &lt; 240ms
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer border border-surface-container-high"
          >
            Close Feed
          </button>
        </div>
      </div>
    </div>
  );
};
