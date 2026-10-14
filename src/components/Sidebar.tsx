import React from 'react';
import { ActiveScreen } from '../types';
import { GymConfig } from '../config/gym';

interface SidebarProps {
  gym: GymConfig;
  userRole?: string;
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  pendingDueCount?: number;
  expiringCount?: number;
  onOpenFeedback?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  gym,
  userRole = 'Gym Owner',
  activeScreen,
  setActiveScreen,
  mobileOpen,
  setMobileOpen,
  expiringCount = 0,
  onOpenFeedback,
}) => {
  const isStaff = userRole === 'Staff';

  // Staff panel has access ONLY to:
  // 1. Add/manage members
  // 2. Memberships & Plans
  // 3. Supplements for selling (POS)
  // 4. Workout plans (editable)
  // 5. Floor velocity
  const navItems: { id: ActiveScreen; label: string; icon: string; badge?: string }[] = isStaff
    ? [
        { id: 'members', label: 'Members & Add Member', icon: 'person_add' },
        { id: 'memberships', label: 'Memberships & Plans', icon: 'card_membership' },
        { id: 'supplements', label: 'Supplements POS', icon: 'medication' },
        { id: 'workout-plans', label: 'Workout Plans', icon: 'fitness_center' },
        { id: 'floor-velocity', label: 'Floor Velocity Live', icon: 'speed' },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'members', label: 'Members', icon: 'group' },
        { id: 'memberships', label: 'Plans', icon: 'card_membership' },
        { id: 'supplements', label: 'Supplements POS', icon: 'medication' },
        { id: 'workout-plans', label: 'Workout Plans', icon: 'fitness_center' },
        { id: 'floor-velocity', label: 'Floor Velocity', icon: 'speed' },
        { id: 'payments', label: 'Payments', icon: 'payments' },
        { id: 'enquiries', label: 'Enquiries', icon: 'contact_phone' },
        { id: 'settings', label: 'Settings', icon: 'settings' },
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest flex flex-col justify-between z-50 shadow-[0_1px_8px_rgba(0,0,0,0.2)] border-r border-surface-container transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo & Panel Badge */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-3xl">fitness_center</span>
              <div className="flex flex-col">
                <span className="font-sora text-[1.125rem] font-semibold uppercase text-on-surface tracking-wider leading-none">
                  {gym.shortName}
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`font-sans text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                      isStaff
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-secondary/15 text-secondary border-secondary/30'
                    }`}
                  >
                    {isStaff ? '🛡️ Staff Panel' : '👑 Owner Panel'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-outline hover:text-on-surface p-1"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Section Divider */}
          <div className="px-4 pt-3 pb-1">
            <span className="px-2 font-sans text-[11px] font-bold uppercase tracking-wider text-outline">
              {isStaff ? 'Staff Modules' : 'Owner Menu'}
            </span>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1 px-4 pt-1">
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveScreen(item.id);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-surface-container text-on-surface font-bold shadow-[inset_4px_0_0_0_#947dff]'
                      : 'text-on-surface-variant text-[0.8125rem] font-medium hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <span className="tracking-wide text-xs sm:text-[13px]">{item.label}</span>
                  </div>

                  {item.id === 'members' && expiringCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-error-container/50 text-error border border-error/30">
                      {expiringCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Gym card & Feedback option at the end of navigation */}
        <div className="p-3 m-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2.5 shadow-[0_0_12px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30 shrink-0">
              {gym.initials}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[0.8125rem] font-bold text-on-surface truncate">{gym.name}</span>
              <span className="text-[0.7rem] text-on-surface-variant truncate">
                {gym.address || `Code: ${gym.slug}`}
              </span>
            </div>
          </div>

          {/* Feedback & Query option only for owner */}
          {!isStaff && (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenFeedback?.();
              }}
              className="w-full py-2 px-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface transition-all flex items-center justify-between text-xs font-semibold cursor-pointer border border-surface-container-highest"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">support_agent</span>
                <span>Feedback / Query</span>
              </div>
              <span className="material-symbols-outlined text-sm text-outline">arrow_forward</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
