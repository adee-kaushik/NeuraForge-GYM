'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const MemberNav: React.FC = () => {
  const pathname = usePathname();

  const tabs = [
    { href: '/member', label: 'Digital Pass', icon: 'badge' },
    { href: '/member/plans', label: 'Workout & Diet', icon: 'fitness_center' },
    { href: '/member/messages', label: 'Messages', icon: 'notifications' },
    { href: '/member/payments', label: 'Payment History', icon: 'receipt_long' },
    { href: '/member/queries', label: 'Help & Queries', icon: 'support_agent' },
  ];

  return (
    <nav className="grid grid-cols-3 sm:grid-cols-5 p-1 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold gap-1 shadow-xs">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`py-2 px-1 text-center rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all ${
              isActive
                ? 'bg-surface-container-lowest text-on-surface shadow-xs text-secondary'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            <span className="whitespace-normal">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
