import React, { useEffect, useState } from 'react';

interface HeaderProps {
  onOpenAddMember: () => void;
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
  onOpenBulkWhatsApp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddMember,
  onOpenSearch,
  onToggleMobileMenu,
  onOpenBulkWhatsApp,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'light';
    document.documentElement.classList.toggle('light', saved);
    setLight(saved);
  }, []);

  const toggleTheme = () => {
    const next = !light;
    document.documentElement.classList.toggle('light', next);
    localStorage.setItem('theme', next ? 'light' : 'dark');
    setLight(next);
  };

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface-container-lowest/85 backdrop-blur-xl z-40 px-4 sm:px-6 flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.25)] border-b border-surface-container">
      {/* Left: Mobile hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-outline hover:text-on-surface rounded-lg bg-surface-container-low"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <div
          onClick={onOpenSearch}
          className="relative w-full cursor-pointer group"
        >
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl group-hover:text-secondary transition-colors">
            search
          </span>
          <div className="w-full bg-surface-container pl-10 pr-20 py-1.5 rounded-lg text-[0.75rem] text-outline border border-surface-container-high group-hover:border-secondary/40 transition-all flex items-center justify-between">
            <span className="truncate">Search member by name or phone (e.g. +91 98...)</span>
            <div className="hidden sm:flex items-center px-1.5 py-0.5 rounded bg-surface-container-highest text-[0.6875rem] font-semibold text-on-surface-variant border border-outline-variant/50">
              Ctrl + K
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container-low border border-surface-container-high">
          <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
          <span className="font-sans text-[0.6875rem] font-bold uppercase tracking-wider text-tertiary whitespace-nowrap">
            Status: Optimal
          </span>
        </div>
      </div>

      {/* Right: Date, Notifications, Add Member, Profile */}
      <div className="flex items-center gap-3 sm:gap-4 relative">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[0.8125rem] font-medium text-on-surface leading-tight">
            Mon, 24 Oct
          </span>
          <span className="text-[0.6875rem] text-secondary font-semibold tracking-widest">
            IST
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border border-transparent hover:border-surface-container-high transition-colors"
          title={light ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          <span className="material-symbols-outlined text-2xl">{light ? 'dark_mode' : 'light_mode'}</span>
        </button>

        {/* Notifications button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border border-transparent hover:border-surface-container-high transition-colors"
            title="System Notifications"
          >
            <span className="material-symbols-outlined text-2xl">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-error-container text-on-error-container text-[0.6875rem] flex items-center justify-center font-bold ring-2 ring-surface-container-lowest">
              3
            </span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-surface-container-low border border-surface-container-highest rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">bolt</span>
                  <span className="font-sora font-semibold text-sm text-on-surface">
                    Tactical Feeds
                  </span>
                </div>
                <span className="text-[0.6875rem] text-secondary font-bold">3 Unread</span>
              </div>

              <div className="divide-y divide-surface-container-high max-h-72 overflow-y-auto">
                <div
                  onClick={() => {
                    setShowNotifications(false);
                    onOpenBulkWhatsApp();
                  }}
                  className="py-2.5 px-1 hover:bg-surface-container rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-error mt-1 shrink-0"></span>
                    <div>
                      <p className="text-xs text-error font-semibold">
                        14 Memberships Expiring in 48h
                      </p>
                      <p className="text-[0.6875rem] text-on-surface-variant mt-0.5">
                        Urgent renewal dispatch ready via WhatsApp API.
                      </p>
                      <span className="text-[0.625rem] text-outline">2 mins ago</span>
                    </div>
                  </div>
                </div>

                <div className="py-2.5 px-1 hover:bg-surface-container rounded transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4edea3] mt-1 shrink-0"></span>
                    <div>
                      <p className="text-xs text-on-surface font-medium">Gate 2 Biometric Synced</p>
                      <p className="text-[0.6875rem] text-outline mt-0.5">
                        Firmware v3.12 · 74 check-ins logged cleanly.
                      </p>
                      <span className="text-[0.625rem] text-outline">08:30 AM IST</span>
                    </div>
                  </div>
                </div>

                <div className="py-2.5 px-1 hover:bg-surface-container rounded transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#cabeff] mt-1 shrink-0"></span>
                    <div>
                      <p className="text-xs text-on-surface font-medium">Monthly Quest: 77.2% XP</p>
                      <p className="text-[0.6875rem] text-outline mt-0.5">
                        ₹3,86,000 / ₹5,00,000 recorded. Rank 4 Active.
                      </p>
                      <span className="text-[0.625rem] text-outline">Today</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Member Button */}
        <button
          onClick={onOpenAddMember}
          className="flex items-center gap-1.5 bg-primary-container hover:bg-[#cabeff] text-on-primary-container font-bold text-[0.8125rem] px-3.5 py-1.5 rounded-lg shadow-[0_0_16px_rgba(148,125,255,0.35)] transition-all hover:shadow-[0_0_24px_rgba(202,190,255,0.6)] active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span className="whitespace-nowrap">Add Member</span>
        </button>

        {/* User Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="ring-1 ring-secondary/40 hover:ring-secondary rounded-full transition-all focus:outline-none"
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuSNGwY4LSqbThfGRLDoY-oL4HMZMK6lufIppZfiefJFDFo4RSqzcZpY4SWiQc6UnAQKHxyk2lEBMFSl-vppOFOJ_QBh14FNifWguJi4ih5VygOqG1axDQ8c5EuC8DfrVkAcCd8g8mK-PRLmeJvnN-amnpbnS_f81xasNH-nsWvF0_bA4r2l8ikzM6ZZXnC6kOly7sqMGA_4-tf1Cd8dXhJzatRkU1pQ-fuXkmMl219tyIh7FEaHwS"
              alt="Gym Master Profile"
              className="w-8 h-8 rounded-full object-cover shrink-0 cursor-pointer"
            />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-64 bg-surface-container-low border border-surface-container-highest rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] p-3 z-50">
              <div className="flex items-center gap-3 pb-3 border-b border-surface-container-high">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuSNGwY4LSqbThfGRLDoY-oL4HMZMK6lufIppZfiefJFDFo4RSqzcZpY4SWiQc6UnAQKHxyk2lEBMFSl-vppOFOJ_QBh14FNifWguJi4ih5VygOqG1axDQ8c5EuC8DfrVkAcCd8g8mK-PRLmeJvnN-amnpbnS_f81xasNH-nsWvF0_bA4r2l8ikzM6ZZXnC6kOly7sqMGA_4-tf1Cd8dXhJzatRkU1pQ-fuXkmMl219tyIh7FEaHwS"
                  alt="Owner"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-on-surface truncate">Karan Singhania</p>
                  <p className="text-[0.6875rem] text-secondary font-semibold">Guild Master · Level 4</p>
                  <p className="text-[0.625rem] text-outline truncate">admin@ironpulsegym.in</p>
                </div>
              </div>
              <div className="pt-2 text-xs text-on-surface-variant flex flex-col gap-1">
                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-surface-container rounded">
                  <span>Branch</span>
                  <span className="text-secondary font-medium">Indiranagar #1</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-surface-container rounded">
                  <span>GSTIN</span>
                  <span className="text-mono text-[0.6875rem] text-on-surface-variant">29AAAAA0000A1Z5</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-surface-container rounded">
                  <span>System Build</span>
                  <span className="text-[0.6875rem] text-tertiary">v2.4.9 Stable</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
