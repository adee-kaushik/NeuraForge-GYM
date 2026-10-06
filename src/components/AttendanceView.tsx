import React, { useState } from 'react';
import { CheckInLog, Member } from '../types';

interface AttendanceViewProps {
  checkIns: CheckInLog[];
  members: Member[];
  onMarkPresent: (member: Member) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ checkIns, members, onMarkPresent }) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const results = q
    ? members.filter((m) => m.name.toLowerCase().includes(q) || m.phone.includes(q)).slice(0, 5)
    : [];

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary text-2xl">fact_check</span>
          <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Attendance</h1>
        </div>
        <p className="text-xs text-outline mt-1">Mark members present and see who came in today</p>
      </div>

      {/* Mark attendance */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-3">
        <h2 className="font-sora text-sm font-semibold text-on-surface">Mark Attendance</h2>
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search member by name or phone number"
            className="w-full bg-surface-container-lowest pl-9 pr-3 py-2 rounded-lg text-xs text-on-surface border border-surface-container-high focus:border-secondary focus:outline-none"
          />
        </div>

        {q && results.length === 0 && <p className="text-xs text-outline">No member found.</p>}

        {results.map((m) => {
          const alreadyIn = checkIns.some((c) => c.memberId === m.id);
          const expired = m.status === 'expired';
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
                    {m.planDuration} plan · {expired ? 'Expired' : `${m.daysLeft} days left`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onMarkPresent(m)}
                disabled={alreadyIn || expired}
                className="px-4 py-1.5 rounded-lg bg-[#4edea3] hover:bg-[#34c78b] text-[#002113] text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {expired ? 'Renew first' : alreadyIn ? 'Already present' : 'Mark Present'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Today's attendance */}
      <div className="rounded-xl bg-surface-container-low border border-surface-container-high overflow-hidden">
        <div className="p-4 border-b border-surface-container-high">
          <h2 className="font-sora text-sm font-semibold text-on-surface">
            Today&apos;s Attendance ({checkIns.length})
          </h2>
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
                <tr key={log.id}>
                  <td data-label="Member" className="py-3 px-4 font-semibold">{log.memberName}</td>
                  <td data-label="Plan" className="py-3 px-4 text-on-surface-variant">{log.planDuration}</td>
                  <td data-label="Time" className="py-3 px-4 text-on-surface-variant">{log.time}</td>
                </tr>
              ))}
              {checkIns.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 px-4 text-center text-outline">
                    No one has been marked present yet today.
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
