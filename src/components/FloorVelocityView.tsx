'use client';

import React, { useState, useMemo } from 'react';
import type { Member, CheckInLog } from '@/types';
import type { DashboardStats } from '@/lib/stats';
import type { ScanCheckInResult } from '@/actions/attendance';
import { isSameDay } from '@/lib/format';

interface FloorVelocityViewProps {
  gymName: string;
  gymSlug: string;
  stats: DashboardStats;
  members: Member[];
  checkIns: CheckInLog[];
  onCheckInByCode: (code: string) => Promise<ScanCheckInResult>;
}

export const FloorVelocityView: React.FC<FloorVelocityViewProps> = ({
  gymName,
  stats,
  members,
  checkIns,
  onCheckInByCode,
}) => {
  const [codePunch, setCodePunch] = useState('');
  const [punching, setPunching] = useState(false);
  const [punchResult, setPunchResult] = useState<{ ok: boolean; message: string; memberName?: string } | null>(null);

  const now = new Date();

  // Filter checkins today
  const todayCheckIns = useMemo(() => {
    return checkIns
      .filter((c) => isSameDay(c.checkedInAt, now))
      .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime());
  }, [checkIns, now]);

  // Active on floor right now: check-ins within last 2 hours (120 mins)
  const activeOnFloor = useMemo(() => {
    const twoHoursAgo = now.getTime() - 2 * 60 * 60 * 1000;
    return todayCheckIns.filter((c) => new Date(c.checkedInAt).getTime() >= twoHoursAgo);
  }, [todayCheckIns, now]);

  // Estimated max capacity based on member size (min 30, max 100)
  const maxCapacity = Math.max(30, Math.min(100, Math.round(members.length * 0.35) || 40));
  const occupancyPercent = Math.min(100, Math.round((activeOnFloor.length / maxCapacity) * 100));

  const rushStatus =
    occupancyPercent >= 75
      ? { label: '🔴 PEAK RUSH HOUR', color: 'text-error bg-error/15 border-error/30' }
      : occupancyPercent >= 45
      ? { label: '🟡 MODERATE RUSH', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' }
      : { label: '🟢 OPTIMAL WORKOUT FLOW', color: 'text-[#4edea3] bg-[#4edea3]/15 border-[#4edea3]/30' };

  // Timing Slot breakdown
  const morningSlotCount = members.filter((m) => m.timingSlot === 'MORNING' || m.timingSlot === 'BOTH').length;
  const eveningSlotCount = members.filter((m) => m.timingSlot === 'EVENING' || m.timingSlot === 'BOTH').length;

  const handlePunchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codePunch.trim().toUpperCase();
    if (!clean) return;

    setPunching(true);
    setPunchResult(null);
    const res = await onCheckInByCode(clean);
    setPunching(false);
    if ('member' in res && res.ok) {
      setPunchResult({
        ok: true,
        message: `Access granted for ${res.member.name} (${res.member.planName})`,
        memberName: res.member.name,
      });
      setCodePunch('');
    } else {
      const errRes = res as { ok: false; error: string; memberName?: string };
      setPunchResult({
        ok: false,
        message: errRes.error || 'Check-in failed',
        memberName: errRes.memberName,
      });
    }
  };

  const getElapsedMinutes = (dateStr: string) => {
    const diff = Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
    if (diff < 1) return 'Just checked in';
    if (diff < 60) return `${diff} min on floor`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m on floor`;
  };

  const maxDayCount = Math.max(1, ...stats.last7Days.map((d) => d.count));

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">speed</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Floor Velocity &amp; Live Attendance</h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Real-time gym floor occupancy, peak rush velocity, biometrics sync, and rapid front desk punch check-ins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tertiary/15 text-tertiary border border-tertiary/30 text-xs font-bold shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-ping" />
            <span>Biometrics Live</span>
          </div>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Currently on Floor */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-outline">Active on Floor</span>
            <span className="material-symbols-outlined text-secondary text-xl">vital_signs</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-sora text-3xl font-bold text-on-surface">{activeOnFloor.length}</span>
            <span className="text-xs text-outline">/ {maxCapacity} capacity</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-secondary h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-outline">{occupancyPercent}% gym occupancy right now</p>
        </div>

        {/* Card 2: Today Total Entries */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-outline">Today Total Entries</span>
            <span className="material-symbols-outlined text-tertiary text-xl">how_to_reg</span>
          </div>
          <div className="font-sora text-3xl font-bold text-on-surface">{stats.todayEntries}</div>
          <p className="text-[11px] text-tertiary font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span>Recorded via Biometrics, QR &amp; Code</span>
          </p>
        </div>

        {/* Card 3: Live Rush Status */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-outline">Rush Velocity</span>
            <span className="material-symbols-outlined text-amber-400 text-xl">bolt</span>
          </div>
          <div>
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${rushStatus.color}`}>
              {rushStatus.label}
            </span>
          </div>
          <p className="text-[11px] text-outline">Machine availability &amp; floor flow status</p>
        </div>

        {/* Card 4: Slot Distribution */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-outline">Slot Allocation</span>
            <span className="material-symbols-outlined text-primary text-xl">schedule</span>
          </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fde047] shadow-xs" />
                <span className="text-on-surface font-medium">Morning: <b className="text-[#fde047] font-bold">{morningSlotCount}</b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span className="text-on-surface font-medium">Evening: <b className="text-indigo-300 font-bold">{eveningSlotCount}</b></span>
              </div>
            </div>
          <p className="text-[11px] text-outline">Registered members timing preferences</p>
        </div>
      </div>

      {/* Main Grid: Fast Code Punch + 7-Day Velocity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fast Punch Action (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-low rounded-2xl border border-surface-container-high p-5 sm:p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-surface-container-high">
              <span className="material-symbols-outlined text-secondary text-xl">fingerprint</span>
              <h2 className="font-sora text-sm sm:text-base font-bold text-on-surface">Front Desk Check-in Punch</h2>
            </div>
            <p className="text-xs text-outline mt-2 leading-relaxed">
              Enter member code (e.g. <b>MEM-001</b>) or member mobile digits to instantly record floor entry.
            </p>

            <form onSubmit={handlePunchSubmit} className="mt-4 space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={codePunch}
                  onChange={(e) => setCodePunch(e.target.value)}
                  placeholder="e.g. MEM-001 or 9876543210"
                  className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-xl px-4 py-3 text-sm font-mono text-on-surface focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={punching || !codePunch.trim()}
                className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">check</span>
                <span>{punching ? 'Recording Punch...' : 'Record Floor Check-in'}</span>
              </button>
            </form>

            {punchResult && (
              <div
                className={`mt-4 p-3.5 rounded-xl border text-xs font-semibold animate-in fade-in flex items-start gap-2.5 ${
                  punchResult.ok
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-error/15 border-error/30 text-error'
                }`}
              >
                <span className="material-symbols-outlined text-base mt-0.5">
                  {punchResult.ok ? 'check_circle' : 'error'}
                </span>
                <div>
                  <p className="font-bold">{punchResult.message}</p>
                  {punchResult.memberName && (
                    <p className="text-[11px] opacity-90 mt-0.5">Welcome to {gymName}, {punchResult.memberName}!</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-[11px] text-outline space-y-1">
            <div className="flex items-center gap-1.5 text-on-surface font-semibold">
              <span className="material-symbols-outlined text-sm text-secondary">wifi_tethering</span>
              <span>Biometric Device Automatic Sync</span>
            </div>
            <p>
              eSSL &amp; ZKTeco biometric punches via <code>/iclock/cdata</code> sync live straight to this floor velocity feed.
            </p>
          </div>
        </div>

        {/* 7-Day Velocity Chart (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-low rounded-2xl border border-surface-container-high p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
            <div>
              <h2 className="font-sora text-sm sm:text-base font-bold text-on-surface">Weekly Floor Velocity Trend</h2>
              <p className="text-xs text-outline mt-0.5">Daily member entry volume over the last 7 days</p>
            </div>
            <span className="text-xs font-bold text-tertiary">7-Day Graph</span>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high">
            <div className="flex items-end justify-between h-44 gap-3 pt-3">
              {stats.last7Days.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span
                    className={`text-xs transition-colors ${
                      d.isToday ? 'text-tertiary font-bold' : 'text-outline group-hover:text-primary'
                    }`}
                  >
                    {d.count}
                  </span>
                  <div
                    className={`w-full rounded-t transition-all ${
                      d.isToday
                        ? 'bg-gradient-to-t from-[#947dff] to-[#4edea3] shadow-[0_0_16px_rgba(78,222,163,0.5)]'
                        : 'bg-surface-container-highest hover:bg-primary/50'
                    }`}
                    style={{ height: `${Math.max(6, Math.round((d.count / maxDayCount) * 100))}%` }}
                  />
                  <span className={`text-xs ${d.isToday ? 'text-tertiary font-bold' : 'text-outline'}`}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high">
              <span className="text-outline uppercase text-[10px] font-bold">Morning Peak Rush</span>
              <p className="font-sora font-bold text-on-surface mt-0.5">6:30 AM – 9:00 AM</p>
              <p className="text-[11px] text-outline mt-0.5">High velocity cardio &amp; functional zones</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high">
              <span className="text-outline uppercase text-[10px] font-bold">Evening Peak Rush</span>
              <p className="font-sora font-bold text-on-surface mt-0.5">5:30 PM – 8:30 PM</p>
              <p className="text-[11px] text-outline mt-0.5">Peak free weights &amp; cable machine volume</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Floor Entries List */}
      <div className="bg-surface-container-low rounded-2xl border border-surface-container-high overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-surface-container-high flex items-center justify-between">
          <div>
            <h2 className="font-sora text-sm sm:text-base font-bold text-on-surface">
              Members Checked In Today ({todayCheckIns.length})
            </h2>
            <p className="text-xs text-outline mt-0.5">Live timestamp log of members currently or recently in gym</p>
          </div>
          <span className="text-xs font-bold text-secondary">{activeOnFloor.length} active now</span>
        </div>

        {todayCheckIns.length === 0 ? (
          <div className="p-10 text-center text-outline text-xs">
            No check-ins recorded yet today. Punch members using the form above or via biometric reader.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container/60 text-outline uppercase text-[10px] font-bold border-b border-surface-container-high">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4">Duration on Floor</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {todayCheckIns.map((item) => {
                  const checkInDate = new Date(item.checkedInAt);
                  const isRecent = Date.now() - checkInDate.getTime() < 120 * 60 * 1000;

                  return (
                    <tr key={item.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-on-surface">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                            {item.memberName
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{item.memberName}</p>
                            <p className="text-[10px] font-mono text-outline">{item.memberId}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-outline font-medium">
                        {item.planDuration || 'Standard Plan'}
                      </td>

                      <td className="py-3 px-4 font-mono text-on-surface">
                        {checkInDate.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 text-outline">
                        {getElapsedMinutes(item.checkedInAt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isRecent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-ping" />
                            <span>On Floor</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-outline border border-surface-container-high">
                            Exited
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
