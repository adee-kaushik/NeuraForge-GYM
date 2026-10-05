import React, { useState } from 'react';
import { Member, HunterRank } from '../types';

interface MembersViewProps {
  members: Member[];
  onSelectMember: (member: Member) => void;
  onOpenAddMember: () => void;
  onOpenBulkWhatsApp: () => void;
  onSendSingleReminder: (member: Member) => void;
  initialFilter?: 'all' | 'expiring';
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  onSelectMember,
  onOpenAddMember,
  onOpenBulkWhatsApp,
  onSendSingleReminder,
  initialFilter = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRank, setSelectedRank] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING'>('ALL');

  const filtered = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.rfidTag.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRank = selectedRank === 'ALL' || m.rank === selectedRank;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'EXPIRING' && (m.status === 'expiring' || m.daysLeft <= 7)) ||
      (statusFilter === 'ACTIVE' && m.status === 'active' && m.daysLeft > 7);

    return matchesSearch && matchesRank && matchesStatus;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Top Header & Enlist Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">groups</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">
              Cadre Roster Management
            </h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Registered gym hunters, biometric tokens, and membership tenure
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenBulkWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] text-xs font-bold border border-[#25D366]/40 transition-all cursor-pointer shadow-[0_0_12px_rgba(37,211,102,0.2)]"
          >
            <span className="material-symbols-outlined text-base">chat</span>
            <span>Bulk WhatsApp Alert</span>
          </button>

          <button
            onClick={onOpenAddMember}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold transition-all shadow-[0_0_16px_rgba(148,125,255,0.35)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>Enlist Hunter</span>
          </button>
        </div>
      </div>

      {/* Cadre Tier Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-wider text-outline">
              Total Roster
            </span>
            <p className="font-sora text-2xl font-bold text-on-surface mt-1">{members.length}</p>
          </div>
          <span className="material-symbols-outlined text-secondary text-2xl">shield</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-wider text-outline">
              Titan / A-Rank
            </span>
            <p className="font-sora text-2xl font-bold text-primary mt-1">
              {members.filter((m) => m.rank === 'RANK S' || m.rank === 'RANK A').length}
            </p>
          </div>
          <span className="material-symbols-outlined text-primary text-2xl">swords</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-wider text-outline">
              Expiring Week
            </span>
            <p className="font-sora text-2xl font-bold text-error mt-1">
              {members.filter((m) => m.daysLeft <= 7).length}
            </p>
          </div>
          <span className="material-symbols-outlined text-error text-2xl">warning</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-wider text-outline">
              Active Today
            </span>
            <p className="font-sora text-2xl font-bold text-tertiary mt-1">74</p>
          </div>
          <span className="material-symbols-outlined text-tertiary text-2xl">verified_user</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cadre by name, mobile, RFID tag..."
            className="w-full bg-surface-container-lowest pl-9 pr-3 py-2 rounded-lg text-xs text-on-surface border border-surface-container-high focus:border-secondary focus:outline-none"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[0.6875rem] text-outline font-bold uppercase mr-1">Rank:</span>
          {(['ALL', 'RANK S', 'RANK A', 'RANK B', 'RANK C', 'RANK E'] as const).map((rank) => (
            <button
              key={rank}
              onClick={() => setSelectedRank(rank)}
              className={`px-2.5 py-1 rounded text-[0.6875rem] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedRank === rank
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
              }`}
            >
              {rank}
            </button>
          ))}

          <div className="h-4 w-px bg-surface-container-highest mx-1"></div>

          {(['ALL', 'ACTIVE', 'EXPIRING'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded text-[0.6875rem] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-[#7bd0ff] text-[#001e2c] font-bold'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Cadre Table */}
      <div className="rounded-xl bg-surface-container-low border border-surface-container-high overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-on-surface text-xs">
            <thead>
              <tr className="text-outline uppercase text-[0.6875rem] bg-surface-container-lowest border-b border-surface-container-high">
                <th className="py-3 px-4">Cadre Member</th>
                <th className="py-3 px-3">Rank Tier</th>
                <th className="py-3 px-3">Biometric RFID</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Streak (Mo)</th>
                <th className="py-3 px-4 text-right">Tactical Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => onSelectMember(member)}
                  className="hover:bg-surface-container/70 transition-colors group cursor-pointer"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                        {member.avatarInitials}
                      </div>
                      <div>
                        <div className="font-semibold text-on-surface group-hover:text-secondary transition-colors">
                          {member.name}
                        </div>
                        <div className="text-[0.6875rem] text-outline">{member.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[0.6875rem] font-bold ${
                        member.rank === 'RANK S'
                          ? 'bg-primary-fixed/20 text-primary-fixed border border-primary-fixed/30'
                          : member.rank === 'RANK A'
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : member.rank === 'RANK B'
                          ? 'bg-secondary/15 text-secondary border border-secondary/30'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {member.rank} · {member.planDuration}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs text-secondary">
                    {member.rfidTag}
                  </td>
                  <td className="py-3.5 px-3 text-on-surface-variant font-mono">
                    {member.expiryDate}
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[0.6875rem] font-bold ${
                        member.daysLeft <= 3
                          ? 'bg-error-container/50 text-error border border-error/30'
                          : member.daysLeft <= 7
                          ? 'bg-secondary-container/20 text-secondary'
                          : 'bg-tertiary-container/20 text-tertiary'
                      }`}
                    >
                      {member.daysLeft}d left
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-on-surface">
                    <span className="font-semibold">{member.attendanceCountThisMonth}</span> sessions
                  </td>
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSendSingleReminder(member)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-[0.6875rem] font-bold transition-all border border-[#25D366]/30 cursor-pointer"
                        title="Send WhatsApp Message"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span>Remind</span>
                      </button>

                      <button
                        onClick={() => onSelectMember(member)}
                        className="p-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high cursor-pointer"
                        title="Inspect Hunter Dossier"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table summary bar */}
        <div className="p-3 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between text-xs text-outline">
          <span>Showing {filtered.length} of {members.length} members</span>
          <span>Indiranagar Domain Tactical Registry</span>
        </div>
      </div>
    </div>
  );
};
