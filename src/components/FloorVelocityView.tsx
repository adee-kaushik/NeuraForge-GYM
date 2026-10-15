'use client';

import React, { useState, useMemo } from 'react';
import type { Member, CheckInLog } from '@/types';
import type { DashboardStats } from '@/lib/stats';
import type { ScanCheckInResult } from '@/actions/attendance';
import { isSameDay, addDays, startOfDay } from '@/lib/format';

interface FloorVelocityViewProps {
  gymName: string;
  gymSlug: string;
  stats: DashboardStats;
  members: Member[];
  checkIns: CheckInLog[];
  onCheckInByCode: (code: string) => Promise<ScanCheckInResult>;
}

type VelocitySlot = 'ALL' | 'MORNING' | 'EVENING';

function getISTHour(dateInput: string | Date): number {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 12;
  const istMinutes = d.getUTCHours() * 60 + d.getUTCMinutes() + 330;
  return Math.floor((istMinutes % 1440) / 60);
}

function getSlotForCheckIn(dateInput: string | Date): 'MORNING' | 'EVENING' | 'AFTERNOON' {
  const hour = getISTHour(dateInput);
  if (hour >= 5 && hour < 12) return 'MORNING';
  if (hour >= 16 && hour < 22) return 'EVENING';
  return 'AFTERNOON';
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

  // Selected velocity slot: 'ALL', 'MORNING', or 'EVENING'
  const [selectedSlot, setSelectedSlot] = useState<VelocitySlot>('ALL');

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

  // Timing Slot breakdown of registered members
  const morningSlotCount = members.filter((m) => m.timingSlot === 'MORNING' || m.timingSlot === 'BOTH').length;
  const eveningSlotCount = members.filter((m) => m.timingSlot === 'EVENING' || m.timingSlot === 'BOTH').length;

  // Breakdown of today's check-ins by slot
  const todayMorningCheckIns = useMemo(
    () => todayCheckIns.filter((c) => getSlotForCheckIn(c.checkedInAt) === 'MORNING'),
    [todayCheckIns]
  );
  const todayEveningCheckIns = useMemo(
    () => todayCheckIns.filter((c) => getSlotForCheckIn(c.checkedInAt) === 'EVENING'),
    [todayCheckIns]
  );

  // 7-Day Velocity Data calculated for ALL, MORNING, and EVENING
  const { allDayCounts, morningDayCounts, eveningDayCounts } = useMemo(() => {
    const today = startOfDay(now);
    const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const all = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, i - 6);
      const isToday = i === 6;
      const dayCheckIns = checkIns.filter((c) => isSameDay(c.checkedInAt, day));
      return {
        label: isToday ? 'TOD' : DAY_LETTERS[day.getDay()],
        count: dayCheckIns.length,
        isToday,
      };
    });

    const morning = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, i - 6);
      const isToday = i === 6;
      const dayCheckIns = checkIns.filter(
        (c) => isSameDay(c.checkedInAt, day) && getSlotForCheckIn(c.checkedInAt) === 'MORNING'
      );
      return {
        label: isToday ? 'TOD' : DAY_LETTERS[day.getDay()],
        count: dayCheckIns.length,
        isToday,
      };
    });

    const evening = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, i - 6);
      const isToday = i === 6;
      const dayCheckIns = checkIns.filter(
        (c) => isSameDay(c.checkedInAt, day) && getSlotForCheckIn(c.checkedInAt) === 'EVENING'
      );
      return {
        label: isToday ? 'TOD' : DAY_LETTERS[day.getDay()],
        count: dayCheckIns.length,
        isToday,
      };
    });

    return { allDayCounts: all, morningDayCounts: morning, eveningDayCounts: evening };
  }, [checkIns, now]);

  // Active chart data based on selectedSlot
  const activeDayCounts = useMemo(() => {
    if (selectedSlot === 'MORNING') return morningDayCounts;
    if (selectedSlot === 'EVENING') return eveningDayCounts;
    return allDayCounts;
  }, [selectedSlot, morningDayCounts, eveningDayCounts, allDayCounts]);

  const maxActiveDayCount = Math.max(1, ...activeDayCounts.map((d) => d.count));

  // Toggle slot filter
  const handleToggleSlot = (slot: 'MORNING' | 'EVENING') => {
    setSelectedSlot((prev) => (prev === slot ? 'ALL' : slot));
  };

  // Filtered members checked in today based on slot
  const displayedCheckIns = useMemo(() => {
    if (selectedSlot === 'MORNING') return todayMorningCheckIns;
    if (selectedSlot === 'EVENING') return todayEveningCheckIns;
    return todayCheckIns;
  }, [selectedSlot, todayCheckIns, todayMorningCheckIns, todayEveningCheckIns]);

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
            Real-time gym floor occupancy, slot rush velocity, biometrics sync, and rapid front desk punch check-ins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tertiary/15 text-tertiary border border-tertiary/30 text-xs font-bold shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-ping" />
            <span>Biometrics Live</span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
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

        {/* Card 4: Registered Slot Distribution */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-outline">Slot Allocation</span>
            <span className="material-symbols-outlined text-secondary text-xl">schedule</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="text-left">
              <span className="text-xs font-bold text-amber-400">🌅 Morning</span>
              <p className="font-sora text-xl font-bold text-on-surface">{morningSlotCount}</p>
            </div>
            <div className="h-8 w-px bg-surface-container-high" />
            <div className="text-right">
              <span className="text-xs font-bold text-[#947dff]">🌆 Evening</span>
              <p className="font-sora text-xl font-bold text-on-surface">{eveningSlotCount}</p>
            </div>
          </div>
          <p className="text-[11px] text-outline">Registered active shift distribution</p>
        </div>
      </div>

      {/* Main Grid: Rapid Punch (5 cols) + Weekly Velocity Chart (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Rapid Check-in Punch Card (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-low rounded-2xl border border-surface-container-high p-5 sm:p-6 space-y-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">qr_code_scanner</span>
                <h2 className="font-sora text-base font-bold text-on-surface">Rapid Front Desk Punch</h2>
              </div>
              <p className="text-xs text-outline mt-1">
                Enter member code (e.g. <b>MEM-001</b>) or member mobile digits to instantly record floor entry.
              </p>
            </div>

            <form onSubmit={handlePunchSubmit} className="space-y-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">
                  pin
                </span>
                <input
                  type="text"
                  value={codePunch}
                  onChange={(e) => setCodePunch(e.target.value)}
                  placeholder="e.g. MEM-001 or 9876543210"
                  className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-xl pl-10 pr-4 py-3 text-sm text-on-surface uppercase font-mono font-bold tracking-wider placeholder:normal-case placeholder:font-normal focus:outline-none transition-all shadow-inner"
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                disabled={punching || !codePunch.trim()}
                className="w-full py-3 px-4 rounded-xl bg-secondary text-surface text-xs font-bold uppercase tracking-wider hover:bg-secondary/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">how_to_reg</span>
                <span>{punching ? 'Recording Punch...' : 'Record Floor Check-in'}</span>
              </button>
            </form>

            {punchResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                  punchResult.ok
                    ? 'bg-tertiary/10 border-tertiary/30 text-tertiary'
                    : 'bg-error/10 border-error/30 text-error'
                }`}
              >
                <span className="material-symbols-outlined text-base shrink-0">
                  {punchResult.ok ? 'check_circle' : 'error'}
                </span>
                <span className="font-semibold">{punchResult.message}</span>
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

        {/* Right: 7-Day Velocity Chart with Clickable Morning & Evening Boxes (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-low rounded-2xl border border-surface-container-high p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container-high flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                  {selectedSlot === 'MORNING'
                    ? 'Weekly Morning Floor Velocity Trend'
                    : selectedSlot === 'EVENING'
                    ? 'Weekly Evening Floor Velocity Trend'
                    : 'Weekly Floor Velocity Trend'}
                </h2>
                {selectedSlot !== 'ALL' && (
                  <button
                    onClick={() => setSelectedSlot('ALL')}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-outline hover:text-on-surface border border-surface-container-high transition-all cursor-pointer"
                  >
                    Reset to All-Day
                  </button>
                )}
              </div>
              <p className="text-xs text-outline mt-0.5">
                {selectedSlot === 'MORNING'
                  ? 'Showing 5:00 AM – 12:00 PM morning entries across last 7 days'
                  : selectedSlot === 'EVENING'
                  ? 'Showing 4:00 PM – 10:00 PM evening entries across last 7 days'
                  : 'Daily member entry volume over the last 7 days (Click Morning/Evening below to filter)'}
              </p>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                selectedSlot === 'MORNING'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : selectedSlot === 'EVENING'
                  ? 'bg-[#947dff]/15 text-[#947dff] border-[#947dff]/30'
                  : 'bg-tertiary/15 text-tertiary border-tertiary/30'
              }`}
            >
              {selectedSlot === 'MORNING' ? '🌅 Morning View' : selectedSlot === 'EVENING' ? '🌆 Evening View' : '24h Graph'}
            </span>
          </div>

          {/* Interactive Bar Chart */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high">
            <div className="flex items-end justify-between h-44 gap-3 pt-3">
              {activeDayCounts.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span
                    className={`text-xs transition-colors ${
                      d.isToday
                        ? selectedSlot === 'MORNING'
                          ? 'text-amber-400 font-bold'
                          : selectedSlot === 'EVENING'
                          ? 'text-[#947dff] font-bold'
                          : 'text-tertiary font-bold'
                        : 'text-outline group-hover:text-primary'
                    }`}
                  >
                    {d.count}
                  </span>
                  <div
                    className={`w-full rounded-t transition-all ${
                      d.isToday
                        ? selectedSlot === 'MORNING'
                          ? 'bg-gradient-to-t from-amber-600 to-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.6)]'
                          : selectedSlot === 'EVENING'
                          ? 'bg-gradient-to-t from-[#6e4ef2] to-[#b399ff] shadow-[0_0_16px_rgba(148,125,255,0.6)]'
                          : 'bg-gradient-to-t from-[#947dff] to-[#4edea3] shadow-[0_0_16px_rgba(78,222,163,0.5)]'
                        : selectedSlot === 'MORNING'
                        ? 'bg-surface-container-highest hover:bg-amber-500/50'
                        : selectedSlot === 'EVENING'
                        ? 'bg-surface-container-highest hover:bg-[#947dff]/50'
                        : 'bg-surface-container-highest hover:bg-primary/50'
                    }`}
                    style={{ height: `${Math.max(6, Math.round((d.count / maxActiveDayCount) * 100))}%` }}
                  />
                  <span
                    className={`text-xs ${
                      d.isToday
                        ? selectedSlot === 'MORNING'
                          ? 'text-amber-400 font-bold'
                          : selectedSlot === 'EVENING'
                          ? 'text-[#947dff] font-bold'
                          : 'text-tertiary font-bold'
                        : 'text-outline'
                    }`}
                  >
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ★ CLICKABLE MORNING & EVENING VELOCITY BOXES ★ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Morning Box */}
            <div
              onClick={() => handleToggleSlot('MORNING')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                selectedSlot === 'MORNING'
                  ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-400/50 shadow-md'
                  : 'bg-surface-container-lowest border-surface-container-high hover:border-amber-500/40 hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-amber-400 uppercase text-[10px] font-bold tracking-wider flex items-center gap-1">
                  <span>🌅 Morning Peak Rush</span>
                  {selectedSlot === 'MORNING' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all ${
                    selectedSlot === 'MORNING'
                      ? 'bg-amber-400 text-black shadow-xs'
                      : 'bg-surface-container text-outline group-hover:text-amber-400'
                  }`}
                >
                  {selectedSlot === 'MORNING' ? '✓ Showing' : 'Click to View'}
                </span>
              </div>
              <p className="font-sora font-bold text-on-surface mt-1 text-sm">6:30 AM – 9:00 AM</p>
              <div className="flex items-center justify-between text-[11px] text-outline mt-1.5 pt-1.5 border-t border-surface-container-high/60">
                <span className="font-semibold text-on-surface">
                  {todayMorningCheckIns.length} entries today
                </span>
                <span className="text-amber-400 font-medium">
                  {morningSlotCount} registered members
                </span>
              </div>
              <p className="text-[10px] text-outline mt-1">High velocity cardio &amp; functional zones</p>
            </div>

            {/* Evening Box */}
            <div
              onClick={() => handleToggleSlot('EVENING')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                selectedSlot === 'EVENING'
                  ? 'bg-[#947dff]/10 border-[#947dff]/50 ring-2 ring-[#947dff]/50 shadow-md'
                  : 'bg-surface-container-lowest border-surface-container-high hover:border-[#947dff]/40 hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#947dff] uppercase text-[10px] font-bold tracking-wider flex items-center gap-1">
                  <span>🌆 Evening Peak Rush</span>
                  {selectedSlot === 'EVENING' && (
                    <span className="w-2 h-2 rounded-full bg-[#947dff] animate-pulse" />
                  )}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all ${
                    selectedSlot === 'EVENING'
                      ? 'bg-[#947dff] text-white shadow-xs'
                      : 'bg-surface-container text-outline group-hover:text-[#947dff]'
                  }`}
                >
                  {selectedSlot === 'EVENING' ? '✓ Showing' : 'Click to View'}
                </span>
              </div>
              <p className="font-sora font-bold text-on-surface mt-1 text-sm">5:30 PM – 8:30 PM</p>
              <div className="flex items-center justify-between text-[11px] text-outline mt-1.5 pt-1.5 border-t border-surface-container-high/60">
                <span className="font-semibold text-on-surface">
                  {todayEveningCheckIns.length} entries today
                </span>
                <span className="text-[#947dff] font-medium">
                  {eveningSlotCount} registered members
                </span>
              </div>
              <p className="text-[10px] text-outline mt-1">Peak free weights &amp; cable machine volume</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Floor Entries List with Slot Badges */}
      <div className="bg-surface-container-low rounded-2xl border border-surface-container-high overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                Members Checked In Today ({displayedCheckIns.length})
              </h2>
              {selectedSlot !== 'ALL' && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    selectedSlot === 'MORNING'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-[#947dff]/15 text-[#947dff] border border-[#947dff]/30'
                  }`}
                >
                  {selectedSlot} SLOT ONLY
                </span>
              )}
            </div>
            <p className="text-xs text-outline mt-0.5">Live timestamp log of members currently or recently in gym</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSlot('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedSlot === 'ALL'
                  ? 'bg-surface-container-highest text-on-surface'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              All ({todayCheckIns.length})
            </button>
            <button
              onClick={() => setSelectedSlot('MORNING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedSlot === 'MORNING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-outline hover:text-amber-400'
              }`}
            >
              <span>🌅 Morning</span>
              <span>({todayMorningCheckIns.length})</span>
            </button>
            <button
              onClick={() => setSelectedSlot('EVENING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedSlot === 'EVENING'
                  ? 'bg-[#947dff]/20 text-[#947dff] border-[#947dff]/30'
                  : 'text-outline hover:text-[#947dff]'
              }`}
            >
              <span>🌆 Evening</span>
              <span>({todayEveningCheckIns.length})</span>
            </button>
            <span className="text-xs font-bold text-secondary ml-2">{activeOnFloor.length} active now</span>
          </div>
        </div>

        {displayedCheckIns.length === 0 ? (
          <div className="p-10 text-center text-outline text-xs space-y-2">
            <p>
              {selectedSlot === 'ALL'
                ? 'No check-ins recorded yet today. Punch members using the form above or via biometric reader.'
                : `No check-ins recorded for the ${selectedSlot.toLowerCase()} slot today.`}
            </p>
            {selectedSlot !== 'ALL' && (
              <button
                onClick={() => setSelectedSlot('ALL')}
                className="text-secondary font-bold hover:underline"
              >
                View all check-ins
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container/60 text-outline uppercase text-[10px] font-bold border-b border-surface-container-high">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Shift Slot</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4">Duration on Floor</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {displayedCheckIns.map((item) => {
                  const checkInDate = new Date(item.checkedInAt);
                  const isRecent = Date.now() - checkInDate.getTime() < 120 * 60 * 1000;
                  const slot = getSlotForCheckIn(item.checkedInAt);

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
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            slot === 'MORNING'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : slot === 'EVENING'
                              ? 'bg-[#947dff]/15 text-[#947dff] border-[#947dff]/30'
                              : 'bg-surface-container text-outline border-surface-container-high'
                          }`}
                        >
                          <span>{slot === 'MORNING' ? '🌅 Morning' : slot === 'EVENING' ? '🌆 Evening' : '☀️ Afternoon'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant font-medium">
                        {members.find((m) => m.id === item.memberId)?.planName || item.planDuration || 'Active Member'}
                      </td>
                      <td className="py-3 px-4 text-outline font-mono">
                        {checkInDate.toLocaleTimeString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </td>
                      <td className="py-3 px-4 text-outline">{getElapsedMinutes(item.checkedInAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isRecent
                              ? 'bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30'
                              : 'bg-surface-container text-outline border border-surface-container-high'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRecent ? 'bg-[#4edea3] animate-pulse' : 'bg-outline'
                            }`}
                          />
                          <span>{isRecent ? 'On Floor' : 'Exited'}</span>
                        </span>
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
