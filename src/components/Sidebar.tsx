import React from 'react';
import { ActiveScreen } from '../types';

interface SidebarProps {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  pendingDueCount?: number;
  expiringCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  setActiveScreen,
  mobileOpen,
  setMobileOpen,
  expiringCount = 19,
}) => {
  const navItems: { id: ActiveScreen; label: string; icon: string; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'members', label: 'Members', icon: 'group' },
    { id: 'memberships', label: 'Plans', icon: 'card_membership' },
    { id: 'attendance', label: 'Attendance', icon: 'fact_check' },
    { id: 'payments', label: 'Payments', icon: 'payments' },
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
          {/* Logo */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-3xl">fitness_center</span>
              <div className="flex flex-col">
                <span className="font-sora text-[1.125rem] font-semibold uppercase text-on-surface tracking-wider leading-none">
                  Iron Pulse
                </span>
                <span className="font-sans text-xs font-semibold text-secondary tracking-widest uppercase mt-1 drop-shadow-[0_0_8px_rgba(123,208,255,0.4)]">
                  Gym Management
                </span>
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
          <div className="px-4 pt-4">
            <span className="px-2 font-sans text-xs font-semibold uppercase tracking-wider text-outline">
              Menu
            </span>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1 px-4 pt-2">
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveScreen(item.id);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-surface-container-high text-primary font-bold shadow-[inset_4px_0_0_0_#cabeff] shadow-[0_0_16px_rgba(148,125,255,0.15)]'
                      : 'text-on-surface-variant text-[0.8125rem] font-medium hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <span className="tracking-wide">{item.label}</span>
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

        {/* Gym card */}
        <div className="p-4 m-4 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center gap-3 shadow-[0_0_12px_rgba(0,0,0,0.3)]">
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30 shrink-0">IP</div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[0.8125rem] font-medium text-on-surface truncate">Iron Pulse Gym</span>
            <span className="text-[0.75rem] text-on-surface-variant truncate">Malviya Nagar, Jaipur</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="text-xs font-semibold text-tertiary leading-none">Open now</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
