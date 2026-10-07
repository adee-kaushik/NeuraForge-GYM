import React, { useState } from 'react';
import { CurrentUser } from '../config/gym';
import { logout } from '@/app/login/actions';
import { DashboardStats } from '../lib/stats';
import { inr } from '../lib/format';

interface HeaderProps {
  user: CurrentUser;
  stats: DashboardStats;
  onOpenAddMember: () => void;
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
  onOpenBulkWhatsApp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  stats,
  onOpenAddMember,
  onOpenSearch,
  onToggleMobileMenu,
  onOpenBulkWhatsApp,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const hasExpiryAlert = stats.expiringIn48h > 0;
  const notificationCount = (hasExpiryAlert ? 1 : 0) + 1; // expiry alert + goal progress

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 px-3 sm:px-6 flex items-center justify-between border-b border-surface-container-high shadow-xs">
      {/* Left: Mobile hamburger & Global Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden h-10 w-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors shrink-0"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <div onClick={onOpenSearch} className="relative w-full cursor-pointer group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl group-hover:text-secondary transition-colors">
            search
          </span>
          <div className="w-full h-10 bg-surface-container pl-10 pr-3 sm:pr-20 rounded-xl text-xs sm:text-sm text-outline border border-surface-container-high group-hover:border-secondary/40 transition-all flex items-center justify-between">
            <span className="truncate">Search members by name or phone</span>
            <div className="hidden sm:flex items-center px-1.5 py-0.5 rounded-md bg-surface-container-highest text-[10px] font-bold text-on-surface-variant border border-surface-container-highest">
              Ctrl + K
            </div>
          </div>
        </div>
      </div>

      {/* Right: Notifications, Add Member, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 relative shrink-0 ml-2">
        {/* Notifications button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative h-10 w-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent hover:border-surface-container-high transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <span className="material-symbols-outlined text-2xl">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-error text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-surface-container-lowest">
              {notificationCount}
            </span>
          </button>

          {/* Notifications Dropdown: Responsive pinned on mobile, anchored on desktop */}
          {showNotifications && (
            <>
              {/* Outside click backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
                onClick={() => setShowNotifications(false)}
              />

              <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-lg">notifications</span>
                    <span className="font-sora font-semibold text-sm text-on-surface">Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary font-bold">{notificationCount} New</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-outline hover:text-on-surface sm:hidden p-1"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-surface-container-high max-h-80 overflow-y-auto pt-1">
                  {hasExpiryAlert && (
                    <div
                      onClick={() => {
                        setShowNotifications(false);
                        onOpenBulkWhatsApp();
                      }}
                      className="py-3 px-2 hover:bg-surface-container-low rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-error mt-1 shrink-0 animate-ping" />
                        <div>
                          <p className="text-xs sm:text-sm text-error font-bold">
                            {stats.expiringIn48h} {stats.expiringIn48h === 1 ? 'membership expires' : 'memberships expire'} in 2 days
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Tap to send 1-tap WhatsApp renewal reminders now.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="py-3 px-2 hover:bg-surface-container-low rounded-xl transition-colors">
                    <div className="flex items-start gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary mt-1 shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm text-on-surface font-semibold">
                          Monthly goal: {Math.round(stats.goalPercent)}% reached
                        </p>
                        <p className="text-xs text-outline mt-0.5">
                          {inr(stats.revenueThisMonth)} of {inr(stats.goal)} collected this month.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Add Member Button: Touch-friendly 40px height */}
        <button
          onClick={onOpenAddMember}
          className="h-10 px-3 sm:px-4 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span className="hidden sm:inline whitespace-nowrap">Add Member</span>
        </button>

        {/* User Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="h-10 w-10 rounded-xl bg-surface-container border border-surface-container-high hover:border-secondary/60 flex items-center justify-center transition-all focus:outline-none cursor-pointer"
            aria-label="User profile menu"
          >
            <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
              {user.initials}
            </span>
          </button>

          {/* Profile Dropdown: Fully responsive */}
          {showProfileMenu && (
            <>
              {/* Outside click backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
                onClick={() => setShowProfileMenu(false)}
              />

              <div className="fixed right-3 top-16 w-72 max-w-[calc(100vw-1.5rem)] sm:absolute sm:right-0 sm:top-12 bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 pb-3 border-b border-surface-container-high">
                  <span className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {user.initials}
                  </span>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <p className="text-sm font-bold text-on-surface truncate">{user.name}</p>
                    <p className="text-xs text-secondary font-semibold">{user.role}</p>
                    <p className="text-xs text-outline truncate">{user.email}</p>
                  </div>
                </div>

                <form action={logout} className="pt-3">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    <span>Sign out of Gym OS</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
