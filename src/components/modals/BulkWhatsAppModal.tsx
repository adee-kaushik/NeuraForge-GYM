'use client';

import React, { useState, useMemo } from 'react';
import { Member } from '../../types';

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  gymName: string;
  onClose: () => void;
  members: Member[];
}

type TemplateType = 'renewal' | 'welcome' | 'inactivity' | 'announcement';

interface TemplateConfig {
  id: TemplateType;
  label: string;
  icon: string;
  description: string;
  defaultText: string;
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: 'renewal',
    label: 'Renewal Reminder',
    icon: 'notifications_active',
    description: 'Remind members whose plans are expiring or already expired',
    defaultText:
      'Hi {name}, your {gym} ({plan}) membership expires on {expiryDate} ({daysLeft} days left). Please renew at the front desk to continue your workout sessions! 🏋️‍♂️💪',
  },
  {
    id: 'welcome',
    label: 'Welcome New Member',
    icon: 'celebration',
    description: 'Welcome new members with gym guidelines and motivation',
    defaultText:
      'Welcome to {gym}, {name}! 🎉 We are thrilled to have you with us on the {plan} plan. Gym timings: 6:00 AM – 10:00 PM. Let us know if you need any workout guidance. Let\'s crush your fitness goals together! 💥',
  },
  {
    id: 'inactivity',
    label: 'We Miss You!',
    icon: 'fitness_center',
    description: 'Re-engage members who haven\'t checked in lately',
    defaultText:
      'Hey {name}, we noticed you haven\'t visited {gym} recently! 🥊 Consistency is the secret to great results. Stop by today for an energetic workout session! 🔥',
  },
  {
    id: 'announcement',
    label: 'Gym Notice',
    icon: 'campaign',
    description: 'Broadcast holidays, timings changes or special updates',
    defaultText:
      'Hello {name}, important announcement from {gym}: Please note our special holiday timings and fitness schedule updates for this week. Have a great day! 🌟',
  },
];

const fillTokens = (text: string, m: Member, gymName: string) =>
  text
    .replace(/\{name\}/g, m.name)
    .replace(/\{gym\}/g, gymName)
    .replace(/\{plan\}/g, m.planDuration)
    .replace(/\{daysLeft\}/g, String(Math.max(0, m.daysLeft)))
    .replace(/\{expiryDate\}/g, m.expiryDate);

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  gymName,
  onClose,
  members,
}) => {
  const [activeTab, setActiveTab] = useState<TemplateType>('renewal');
  const [templateTexts, setTemplateTexts] = useState<Record<TemplateType, string>>({
    renewal: TEMPLATES[0].defaultText,
    welcome: TEMPLATES[1].defaultText,
    inactivity: TEMPLATES[2].defaultText,
    announcement: TEMPLATES[3].defaultText,
  });
  const [search, setSearch] = useState('');

  const currentTemplate = templateTexts[activeTab];

  // Target audience selection per tab
  const targetMembers = useMemo(() => {
    switch (activeTab) {
      case 'renewal':
        return members.filter((m) => m.status === 'expiring' || m.status === 'expired');
      case 'welcome':
        return members
          .slice()
          .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
          .slice(0, 20);
      case 'inactivity':
        return members.filter((m) => m.status === 'active' && m.attendanceCountThisMonth <= 2);
      case 'announcement':
        return members.filter((m) => m.status !== 'expired');
      default:
        return members;
    }
  }, [activeTab, members]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return targetMembers;
    return targetMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.planDuration.toLowerCase().includes(q)
    );
  }, [targetMembers, search]);

  if (!isOpen) return null;

  const handleSend = (m: Member) => {
    const phone = m.phone.replace(/[^0-9]/g, '');
    const message = fillTokens(currentTemplate, m, gymName);
    window.open(
      `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  const handleTextChange = (val: string) => {
    setTemplateTexts((prev) => ({ ...prev, [activeTab]: val }));
  };

  const handleResetTemplate = () => {
    const found = TEMPLATES.find((t) => t.id === activeTab);
    if (found) {
      setTemplateTexts((prev) => ({ ...prev, [activeTab]: found.defaultText }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-surface-container-low border border-[#25D366]/40 rounded-xl shadow-[0_0_50px_rgba(37,211,102,0.2)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center border border-[#25D366]/40">
              <span className="material-symbols-outlined text-xl">chat</span>
            </div>
            <div>
              <h3 className="font-sora text-base font-semibold text-on-surface">
                WhatsApp Communication Hub
              </h3>
              <p className="text-xs text-outline">
                Choose a template, personalize the message, and send directly via WhatsApp.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Campaign Tabs */}
        <div className="px-6 pt-3 border-b border-surface-container-high bg-surface-container-low/50 flex gap-2 overflow-x-auto">
          {TEMPLATES.map((t) => {
            const count =
              t.id === 'renewal'
                ? members.filter((m) => m.status === 'expiring' || m.status === 'expired').length
                : t.id === 'welcome'
                ? Math.min(20, members.length)
                : t.id === 'inactivity'
                ? members.filter((m) => m.status === 'active' && m.attendanceCountThisMonth <= 2).length
                : members.filter((m) => m.status !== 'expired').length;

            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setSearch('');
                }}
                className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#25D366] text-[#25D366] font-bold'
                    : 'border-transparent text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">{t.icon}</span>
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-surface-container text-outline'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-on-surface">
          {/* Template Editor Box */}
          <div className="space-y-2 bg-surface-container-lowest p-3.5 rounded-xl border border-surface-container-high">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-outline flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#25D366]">edit_note</span>
                <span>Message Template</span>
              </span>
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-[11px] text-secondary hover:underline cursor-pointer"
              >
                Reset to default
              </button>
            </div>
            <textarea
              rows={3}
              value={currentTemplate}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full bg-surface-container border border-surface-container-high focus:border-[#25D366] rounded-lg p-3 text-xs text-on-surface focus:outline-none transition-colors"
            />
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-outline">
              <span className="font-semibold text-on-surface-variant">Available Tokens:</span>
              <code className="bg-surface-container px-1 py-0.5 rounded text-secondary">&#123;name&#125;</code>
              <code className="bg-surface-container px-1 py-0.5 rounded text-secondary">&#123;gym&#125;</code>
              <code className="bg-surface-container px-1 py-0.5 rounded text-secondary">&#123;plan&#125;</code>
              <code className="bg-surface-container px-1 py-0.5 rounded text-secondary">&#123;expiryDate&#125;</code>
              <code className="bg-surface-container px-1 py-0.5 rounded text-secondary">&#123;daysLeft&#125;</code>
            </div>
          </div>

          {/* Member List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wider text-outline text-xs">
                Target Members ({filteredMembers.length})
              </span>
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-base">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name or phone..."
                  className="w-full bg-surface-container-lowest pl-8 pr-3 py-1.5 rounded-lg text-xs text-on-surface border border-surface-container-high focus:border-[#25D366] focus:outline-none"
                />
              </div>
            </div>

            <div className="border border-surface-container-high rounded-xl divide-y divide-surface-container-high max-h-72 overflow-y-auto bg-surface-container-lowest shadow-inner">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-surface-container/30 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-on-surface truncate">{member.name}</div>
                    <div className="text-[11px] text-outline flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span>{member.phone}</span>
                      <span>·</span>
                      <span className="text-secondary">{member.planDuration}</span>
                      <span>·</span>
                      {activeTab === 'inactivity' ? (
                        <span className="text-error font-medium">
                          {member.attendanceCountThisMonth} check-ins this month
                        </span>
                      ) : activeTab === 'welcome' ? (
                        <span>Joined: {member.joinDate}</span>
                      ) : (
                        <span className={member.daysLeft <= 3 ? 'text-error font-bold' : ''}>
                          {member.daysLeft < 0
                            ? `Expired ${Math.abs(member.daysLeft)}d ago`
                            : `${member.daysLeft}d left (${member.expiryDate})`}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSend(member)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold border border-[#25D366]/40 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-[0_0_8px_rgba(37,211,102,0.15)]"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>Send</span>
                  </button>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <div className="p-8 text-center text-outline">
                  <span className="material-symbols-outlined text-3xl text-outline/50 block mb-1">
                    group_off
                  </span>
                  No members match this campaign audience.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
