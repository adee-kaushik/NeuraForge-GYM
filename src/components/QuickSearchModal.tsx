import React, { useState, useEffect } from 'react';
import { Member, ActiveScreen } from '../types';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onSelectMember: (member: Member) => void;
  onNavigateScreen: (screen: ActiveScreen) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  members,
  onSelectMember,
  onNavigateScreen,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.phone.includes(query) ||
      m.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-surface-container-low border border-secondary/40 rounded-xl shadow-[0_0_40px_rgba(123,208,255,0.25)] overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary text-2xl">search</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by member name or phone number"
            className="flex-1 bg-transparent border-none text-sm text-on-surface placeholder-outline focus:outline-none"
          />
          <span className="px-2 py-0.5 rounded bg-surface-container-high text-xs font-bold text-on-surface-variant border border-surface-container-highest">
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-4">
          {/* Quick Screen Jumps */}
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-outline px-2">
              Go to
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1.5">
              {[
                { label: 'Dashboard', screen: 'dashboard' as ActiveScreen, icon: 'dashboard' },
                { label: 'Members', screen: 'members' as ActiveScreen, icon: 'group' },
                { label: 'Membership Plans', screen: 'memberships' as ActiveScreen, icon: 'card_membership' },
                { label: 'Attendance', screen: 'attendance' as ActiveScreen, icon: 'fact_check' },
                { label: 'Payments', screen: 'payments' as ActiveScreen, icon: 'payments' },
                { label: 'Settings', screen: 'settings' as ActiveScreen, icon: 'settings' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onNavigateScreen(item.screen);
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-secondary text-xs transition-colors cursor-pointer border border-surface-container-high"
                >
                  <span className="material-symbols-outlined text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Member Search Results */}
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-outline px-2">
              Members ({filteredMembers.length})
            </span>
            <div className="divide-y divide-surface-container-high mt-1.5 border border-surface-container-high rounded-lg bg-surface-container-lowest">
              {filteredMembers.length > 0 ? (
                filteredMembers.slice(0, 8).map((member) => (
                  <div
                    key={member.id}
                    onClick={() => {
                      onSelectMember(member);
                      onClose();
                    }}
                    className="p-2.5 flex items-center justify-between hover:bg-surface-container cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                        {member.avatarInitials}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-on-surface">{member.name}</div>
                        <div className="text-xs text-outline">
                          {member.phone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                        {member.planDuration}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          member.status === 'expiring'
                            ? 'bg-error-container/40 text-error'
                            : 'bg-tertiary-container/20 text-tertiary'
                        }`}
                      >
                        {member.daysLeft} days left
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-outline">
                  No members found matching &quot;{query}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
