import React, { useState } from 'react';
import { CheckInLog, Member } from '../types';

interface AttendanceViewProps {
  checkIns: CheckInLog[];
  members: Member[];
  onOpenScanner: () => void;
  onSimulateCheckIn: (member: Member) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  checkIns,
  members,
  onOpenScanner,
  onSimulateCheckIn,
}) => {
  const [gateFilter, setGateFilter] = useState<'ALL' | 'Gate 1' | 'Gate 2'>('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');

  const filteredLogs = checkIns.filter((log) => {
    if (gateFilter === 'Gate 1') return log.gate.includes('Gate 1');
    if (gateFilter === 'Gate 2') return log.gate.includes('Gate 2');
    return true;
  });

  const handleQuickTap = () => {
    const mem = members.find((m) => m.id === selectedMemberId);
    if (mem) {
      onSimulateCheckIn(mem);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-2xl">
              fact_check
            </span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">
              Turnstile &amp; Floor Telemetry
            </h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Real-time biometric turnstile monitoring, thermal scanning, and ingress audit trail
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary-container/20 hover:bg-secondary-container/35 text-secondary text-xs font-bold transition-all border border-secondary/40 shadow-[0_0_16px_rgba(123,208,255,0.25)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">sensors</span>
            <span>Launch Terminal Scanner HUD</span>
          </button>
        </div>
      </div>

      {/* Hardware Readers Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gate 1 */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="font-sora text-sm font-semibold text-on-surface">
                Gate 1: Reception Turnstile
              </span>
            </div>
            <span className="text-[0.625rem] font-mono text-tertiary bg-tertiary-container/20 px-2 py-0.5 rounded border border-tertiary/30">
              99.8% UPTIME
            </span>
          </div>
          <div className="space-y-1 text-xs text-outline font-mono">
            <div className="flex justify-between">
              <span>Node IP:</span>
              <span className="text-on-surface">192.168.1.104:4370</span>
            </div>
            <div className="flex justify-between">
              <span>Biometric Protocol:</span>
              <span className="text-secondary">SilkBio ZK-Finger v10</span>
            </div>
            <div className="flex justify-between">
              <span>Ingress Count:</span>
              <span className="text-tertiary font-bold">52 Passes Today</span>
            </div>
          </div>
        </div>

        {/* Gate 2 */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="font-sora text-sm font-semibold text-on-surface">
                Gate 2: Heavy Iron Arena
              </span>
            </div>
            <span className="text-[0.625rem] font-mono text-tertiary bg-tertiary-container/20 px-2 py-0.5 rounded border border-tertiary/30">
              ONLINE
            </span>
          </div>
          <div className="space-y-1 text-xs text-outline font-mono">
            <div className="flex justify-between">
              <span>Node IP:</span>
              <span className="text-on-surface">192.168.1.108:4370</span>
            </div>
            <div className="flex justify-between">
              <span>Biometric Protocol:</span>
              <span className="text-secondary">High-Speed Optical RFID</span>
            </div>
            <div className="flex justify-between">
              <span>Ingress Count:</span>
              <span className="text-tertiary font-bold">22 Passes Today</span>
            </div>
          </div>
        </div>

        {/* Floor Occupancy */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sora text-sm font-semibold text-on-surface">
              Floor Capacity
            </span>
            <span className="text-xs text-secondary font-bold">74 / 120 Max</span>
          </div>
          <div className="my-2">
            <div className="h-3 w-full bg-surface-container-lowest rounded-full overflow-hidden p-0.5 border border-surface-container-high">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#947dff] to-[#4edea3]"
                style={{ width: '61.6%' }}
              ></div>
            </div>
          </div>
          <span className="text-[0.6875rem] text-outline">
            Optimal floor circulation · AC zone load at 65%
          </span>
        </div>
      </div>

      {/* Simulator Quick Action Strip */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary text-xl">contactless</span>
          <div>
            <h4 className="text-xs font-bold text-on-surface">Rapid Check-in Testing Tool</h4>
            <p className="text-[0.6875rem] text-outline">
              Simulate turnstile scanner beep &amp; append instant entry to telemetry log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.rank})
              </option>
            ))}
          </select>

          <button
            onClick={handleQuickTap}
            className="px-4 py-1.5 rounded-lg bg-[#4edea3] hover:bg-[#34c78b] text-[#002113] text-xs font-bold transition-all shadow-[0_0_12px_rgba(78,222,163,0.3)] cursor-pointer whitespace-nowrap"
          >
            Tap RFID Card
          </button>
        </div>
      </div>

      {/* Check-ins Log Table */}
      <div className="rounded-xl bg-surface-container-low border border-surface-container-high overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <div className="p-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">history</span>
            <h3 className="font-sora text-sm font-semibold text-on-surface">
              Today&apos;s Gate Ingress Stream ({filteredLogs.length} Entries)
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'Gate 1', 'Gate 2'] as const).map((gate) => (
              <button
                key={gate}
                onClick={() => setGateFilter(gate)}
                className={`px-2.5 py-1 rounded text-[0.6875rem] font-semibold transition-colors cursor-pointer ${
                  gateFilter === gate
                    ? 'bg-[#7bd0ff] text-[#001e2c] font-bold'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {gate}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-on-surface text-xs">
            <thead>
              <tr className="text-outline uppercase text-[0.6875rem] bg-surface-container-lowest/60 border-b border-surface-container-high">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Cadre Member</th>
                <th className="py-2.5 px-4">Rank Tier</th>
                <th className="py-2.5 px-4">Turnstile Gate</th>
                <th className="py-2.5 px-4">Thermal Telemetry</th>
                <th className="py-2.5 px-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-secondary font-semibold">
                    {log.time}
                  </td>
                  <td className="py-3 px-4 font-medium text-on-surface">
                    {log.memberName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[0.6875rem] font-bold">
                      {log.rank} · {log.planDuration}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant">{log.gate}</td>
                  <td className="py-3 px-4 font-mono text-tertiary">
                    {log.temperature || '98.4°F'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-tertiary-container/20 text-tertiary text-[0.6875rem] font-bold border border-tertiary/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
