'use client';

import React, { useState } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'EXPIRY' | 'PAYMENT_DUE' | 'ANNOUNCEMENT' | 'GENERAL' | 'BIRTHDAY';
  createdAt: string;
}

interface MemberNotificationsProps {
  notifications: NotificationItem[];
  gymName: string;
  pendingDue?: number;
  daysLeft?: number | null;
  expiryDateStr?: string;
}

export const MemberNotifications: React.FC<MemberNotificationsProps> = ({
  notifications,
  gymName,
  pendingDue = 0,
  daysLeft = null,
  expiryDateStr,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Synthesize alerts from membership state if no custom reminder exists
  const allNotifications: NotificationItem[] = [...notifications];

  if (pendingDue > 0 && !allNotifications.some((n) => n.type === 'PAYMENT_DUE')) {
    allNotifications.unshift({
      id: 'auto-due',
      title: 'Payment Reminder',
      message: `You have ₹${pendingDue.toLocaleString('en-IN')} pending dues at ${gymName}. You can scan the Gym UPI QR code below or pay at the front desk.`,
      type: 'PAYMENT_DUE',
      createdAt: 'Today',
    });
  }

  if (daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && !allNotifications.some((n) => n.type === 'EXPIRY')) {
    allNotifications.unshift({
      id: 'auto-expiry',
      title: 'Membership Renewal Reminder',
      message: `Your membership expires in ${daysLeft === 0 ? 'today' : `${daysLeft} days`} (${expiryDateStr}). Please renew to keep your workout access active.`,
      type: 'EXPIRY',
      createdAt: 'Today',
    });
  } else if (daysLeft !== null && daysLeft < 0 && !allNotifications.some((n) => n.type === 'EXPIRY')) {
    allNotifications.unshift({
      id: 'auto-expired',
      title: 'Membership Expired',
      message: `Your membership expired on ${expiryDateStr}. Please contact the reception to renew your plan.`,
      type: 'EXPIRY',
      createdAt: 'Notice',
    });
  }

  const activeItems = allNotifications.filter((n) => !dismissed.includes(n.id));

  if (activeItems.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
  };

  return (
    <div className="rounded-2xl border border-secondary/40 bg-surface-container-low/95 p-4 shadow-sm space-y-3">
      {/* Notification Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined text-secondary text-xl">notifications_active</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
          </div>
          <span className="font-sora text-xs font-bold uppercase tracking-wider text-on-surface">
            Owner's Reminders &amp; Notices ({activeItems.length})
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-outline hover:text-on-surface text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>{isOpen ? 'Minimize' : 'Expand'}</span>
          <span className="material-symbols-outlined text-sm">
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {/* Expanded notifications list */}
      {isOpen && (
        <div className="space-y-2.5 pt-1">
          {activeItems.map((item) => {
            const isBirthday = item.type === 'BIRTHDAY';
            const isExpiry = item.type === 'EXPIRY';
            const isDue = item.type === 'PAYMENT_DUE';
            const badgeColor = isBirthday
              ? 'bg-secondary/20 text-secondary border-secondary/40'
              : isDue
              ? 'bg-error/15 text-error border-error/30'
              : isExpiry
              ? 'bg-secondary/15 text-secondary border-secondary/30'
              : 'bg-primary/15 text-primary border-primary/30';
            const icon = isBirthday ? 'cake' : isDue ? 'payments' : isExpiry ? 'event_upcoming' : 'campaign';

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className={`p-1.5 rounded-lg border shrink-0 ${badgeColor} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-sm">{icon}</span>
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-sora font-bold text-on-surface">{item.title}</p>
                      <span className="text-[10px] text-outline">· {item.createdAt}</span>
                    </div>
                    <p className="text-on-surface-variant leading-relaxed text-[11px]">{item.message}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(item.id)}
                  className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer shrink-0"
                  title="Dismiss alert"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
