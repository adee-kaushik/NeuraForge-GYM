import React, { useState } from 'react';
import { Member } from '../types';

interface MembersViewProps {
  members: Member[];
  todayCheckInsCount?: number;
  onSelectMember: (member: Member) => void;
  onOpenAddMember: () => void;
  onOpenImport: () => void;
  onOpenBulkWhatsApp: () => void;
  onSendSingleReminder: (member: Member) => void;
  initialFilter?: 'all' | 'expiring';
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  todayCheckInsCount,
  onSelectMember,
  onOpenAddMember,
  onOpenImport,
  onOpenBulkWhatsApp,
  onSendSingleReminder,
  initialFilter = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expiring' | 'Expired'>('All');

  const filtered = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlan = selectedPlan === 'All' || m.planDuration === selectedPlan;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Expiring' && m.status === 'expiring') ||
      (statusFilter === 'Expired' && m.status === 'expired') ||
      (statusFilter === 'Active' && m.status === 'active');

    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Top Header & Add Member Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">groups</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">
              Members
            </h1>
          </div>
          <p className="text-xs text-outline mt-1">
            All gym members, their plans and expiry dates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenImport}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary text-xs sm:text-sm font-bold border border-secondary/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">upload_file</span>
            <span>Import</span>
          </button>

          <button
            onClick={onOpenBulkWhatsApp}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#15803d] text-xs sm:text-sm font-bold border border-[#25D366]/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">chat</span>
            <span>Send Reminders</span>
          </button>

          <button
            onClick={onOpenAddMember}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold transition-all shadow-sm hover:opacity-90 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">person_add</span>
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-outline">
              Total Members
            </span>
            <p className="font-sora text-2xl font-bold text-on-surface mt-1">{members.length}</p>
          </div>
          <span className="material-symbols-outlined text-secondary text-2xl">groups</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-outline">
              Yearly &amp; VIP
            </span>
            <p className="font-sora text-2xl font-bold text-primary mt-1">
              {members.filter((m) => m.planDuration === 'Yearly' || m.planDuration === 'VIP').length}
            </p>
          </div>
          <span className="material-symbols-outlined text-primary text-2xl">workspace_premium</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-outline">
              Expiring This Week
            </span>
            <p className="font-sora text-2xl font-bold text-error mt-1">
              {members.filter((m) => m.status === 'expiring').length}
            </p>
          </div>
          <span className="material-symbols-outlined text-error text-2xl">warning</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-outline">
              Here Today
            </span>
            <p className="font-sora text-2xl font-bold text-tertiary mt-1">{todayCheckInsCount ?? 0}</p>
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
            placeholder="Search by name or phone number"
            className="w-full bg-surface-container-lowest pl-9 pr-3 py-2 rounded-lg text-xs text-on-surface border border-surface-container-high focus:border-secondary focus:outline-none"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-outline font-bold uppercase mr-1">Plan:</span>
          {['All', ...Array.from(new Set(members.map((m) => m.planName)))].map((plan) => (
            <button
              key={plan}
              onClick={() => setSelectedPlan(plan)}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedPlan === plan
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
              }`}
            >
              {plan}
            </button>
          ))}

          <div className="h-4 w-px bg-surface-container-highest mx-1"></div>

          {(['All', 'Active', 'Expiring', 'Expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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

      {/* Members Table */}
      <div className="rounded-xl bg-surface-container-low border border-surface-container-high overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <div className="overflow-x-auto">
          <table className="stack w-full text-left text-on-surface text-xs">
            <thead>
              <tr className="text-outline uppercase text-xs bg-surface-container-lowest border-b border-surface-container-high">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Visits This Month</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => onSelectMember(member)}
                  className="hover:bg-surface-container/70 transition-colors group cursor-pointer"
                >
                  <td data-label="Member" className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                        {member.avatarInitials}
                      </div>
                      <div>
                        <div className="font-semibold text-on-surface group-hover:text-secondary transition-colors">
                          {member.name}
                        </div>
                        <div className="text-xs text-outline">{member.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Plan" className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        member.planDuration === 'VIP'
                          ? 'bg-primary-fixed/20 text-primary-fixed border border-primary-fixed/30'
                          : member.planDuration === 'Yearly'
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : member.planDuration === 'Half-Yearly'
                          ? 'bg-secondary/15 text-secondary border border-secondary/30'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {member.planDuration}
                    </span>
                  </td>
                  <td data-label="Expiry Date" className="py-3.5 px-3 text-on-surface-variant font-mono">
                    {member.expiryDate}
                  </td>
                  <td data-label="Status" className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        member.daysLeft <= 3
                          ? 'bg-error-container/50 text-error border border-error/30'
                          : member.daysLeft <= 7
                          ? 'bg-secondary-container/20 text-secondary'
                          : 'bg-tertiary-container/20 text-tertiary'
                      }`}
                    >
                      {member.daysLeft < 0 ? `Expired ${Math.abs(member.daysLeft)}d ago` : `${member.daysLeft} days left`}
                    </span>
                  </td>
                  <td data-label="Visits This Month" className="py-3.5 px-3 text-on-surface">
                    <span className="font-semibold">{member.attendanceCountThisMonth}</span> visits
                  </td>
                  <td data-label="" className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSendSingleReminder(member)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold transition-all border border-[#25D366]/30 cursor-pointer"
                        title="Send WhatsApp reminder"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span>Remind</span>
                      </button>

                      <button
                        onClick={() => onSelectMember(member)}
                        className="p-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high cursor-pointer"
                        title="View member"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-14 px-4 text-center">
                    {members.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-2xl">person_add</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">No members added yet</p>
                          <p className="text-xs text-outline mt-1">
                            Build your member roster manually or import existing member records from a spreadsheet.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={onOpenAddMember}
                            className="px-3.5 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold cursor-pointer transition-colors"
                          >
                            + Add Member
                          </button>
                          <button
                            onClick={onOpenImport}
                            className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary text-xs font-bold border border-secondary/30 cursor-pointer transition-colors"
                          >
                            Import Excel / CSV
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-outline">
                        <span className="material-symbols-outlined text-2xl block mb-1">search_off</span>
                        No members match the current filter or search query.
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table summary bar */}
        <div className="p-3 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between text-xs text-outline">
          <span>Showing {filtered.length} of {members.length} members</span>
        </div>
      </div>
    </div>
  );
};
