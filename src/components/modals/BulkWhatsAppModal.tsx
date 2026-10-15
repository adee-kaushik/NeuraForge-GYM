'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Member } from '../../types';
import { sendBulkMemberReminders, broadcastGymAnnouncement } from '@/actions/reminders';

export type CampaignType = 'renewal' | 'announcement' | 'birthday' | 'welcome' | 'inactivity';

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  gymName: string;
  onClose: () => void;
  members: Member[];
  initialTab?: CampaignType;
}

interface TemplateConfig {
  id: CampaignType;
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
      'Hi {name}, your {gym} ({plan}) membership expires on {expiryDate} ({daysLeft} days left). Please renew at the front desk or via UPI to continue your workout sessions! 🏋️‍♂️💪',
  },
  {
    id: 'announcement',
    label: 'Gym Notice',
    icon: 'campaign',
    description: 'Broadcast gym notices, holiday timings or schedule updates to all members',
    defaultText:
      'Hello {name}, important gym notice from {gym} ({plan} member): Please note our special upcoming timings and fitness schedule updates for this week. See you at the gym! 🌟💪',
  },
  {
    id: 'birthday',
    label: 'Birthday Wish',
    icon: 'cake',
    description: 'Wish members whose birthday is today',
    defaultText:
      'Happy Birthday, {name}! 🎂 Warmest wishes from the entire team at {gym}! May this year bring you great health, energy, and strength. Keep crushing your fitness goals! 🎉💪',
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
];

export const fillTokens = (text: string, m: Member, gymName: string) =>
  text
    .replace(/\{name\}/g, m.name)
    .replace(/\{gym\}/g, gymName)
    .replace(/\{plan\}/g, m.planDuration || 'Gym Plan')
    .replace(/\{daysLeft\}/g, String(Math.max(0, m.daysLeft)))
    .replace(/\{expiryDate\}/g, m.expiryDate);

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  gymName,
  onClose,
  members,
  initialTab = 'renewal',
}) => {
  const [activeTab, setActiveTab] = useState<CampaignType>(initialTab);
  const [templateTexts, setTemplateTexts] = useState<Record<CampaignType, string>>({
    renewal: TEMPLATES[0].defaultText,
    announcement: TEMPLATES[1].defaultText,
    birthday: TEMPLATES[2].defaultText,
    welcome: TEMPLATES[3].defaultText,
    inactivity: TEMPLATES[4].defaultText,
  });
  const [search, setSearch] = useState('');

  // Bulk Sender Queue State
  const [isBulkActive, setIsBulkActive] = useState(false);
  const [bulkIndex, setBulkIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [sentMemberIds, setSentMemberIds] = useState<Set<string>>(new Set());
  const [portalNoticeStatus, setPortalNoticeStatus] = useState<string>('');
  const [isSavingToPortal, setIsSavingToPortal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      setIsBulkActive(false);
      setBulkIndex(0);
      setPortalNoticeStatus('');
    }
  }, [isOpen, initialTab]);

  const currentTemplate = templateTexts[activeTab];

  // Target audience selection per tab
  const targetMembers = useMemo(() => {
    switch (activeTab) {
      case 'renewal':
        return members.filter((m) => m.status === 'expiring' || m.status === 'expired' || m.daysLeft <= 7);
      case 'announcement':
        return members.filter((m) => m.status !== 'expired');
      case 'birthday':
        return members.filter((m) => m.isBirthdayToday);
      case 'welcome':
        return members
          .slice()
          .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
          .slice(0, 25);
      case 'inactivity':
        return members.filter((m) => m.status === 'active' && m.attendanceCountThisMonth <= 2);
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

  const currentBulkMember = filteredMembers[bulkIndex] || null;

  const handleSendSingle = (m: Member) => {
    const phone = m.phone.replace(/[^0-9]/g, '');
    const message = fillTokens(currentTemplate, m, gymName);
    window.open(
      `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`,
      '_blank'
    );
    setSentMemberIds((prev) => new Set(prev).add(m.id));
  };

  const handleStartBulkSend = async () => {
    if (filteredMembers.length === 0) return;

    setIsSavingToPortal(true);
    setPortalNoticeStatus('Syncing notices to member passes...');

    // Automatically create in-app notices for all target members
    try {
      if (activeTab === 'renewal') {
        const res = await sendBulkMemberReminders(
          filteredMembers.map((m) => m.id),
          currentTemplate
        );
        if (res.ok) {
          setPortalNoticeStatus(`✓ Saved ${res.count} renewal notices to member portal`);
        }
      } else if (activeTab === 'announcement') {
        const res = await broadcastGymAnnouncement('Gym Notice', currentTemplate);
        if (res.ok) {
          setPortalNoticeStatus('✓ Broadcasted gym notice to all member portals');
        }
      }
    } catch {
      // Continue even if in-app sync encounters an issue
      setPortalNoticeStatus('');
    } finally {
      setIsSavingToPortal(false);
    }

    // Launch sequential bulk sender
    setBulkIndex(0);
    setIsBulkActive(true);
  };

  const handleBulkStepSend = (m: Member) => {
    handleSendSingle(m);
    if (autoAdvance) {
      if (bulkIndex < filteredMembers.length - 1) {
        setBulkIndex((prev) => prev + 1);
      }
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-surface-container-low border border-[#25D366]/40 rounded-2xl shadow-[0_0_50px_rgba(37,211,102,0.2)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center border border-[#25D366]/40 shadow-xs">
              <span className="material-symbols-outlined text-xl">chat</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                  Bulk Communication Hub
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#25D366]/15 text-[#15803d] border border-[#25D366]/30 uppercase">
                  WhatsApp Auto-Fill
                </span>
              </div>
              <p className="text-[11px] text-outline mt-0.5">
                Dynamic bulk messages with auto-filled <strong className="text-on-surface">{'{name}'}</strong> and <strong className="text-on-surface">{'{plan}'}</strong> per member.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Campaign Tabs */}
        <div className="px-5 pt-3 border-b border-surface-container-high bg-surface-container-low/50 flex gap-2 overflow-x-auto">
          {TEMPLATES.map((t) => {
            const count =
              t.id === 'renewal'
                ? members.filter((m) => m.status === 'expiring' || m.status === 'expired' || m.daysLeft <= 7).length
                : t.id === 'announcement'
                ? members.filter((m) => m.status !== 'expired').length
                : t.id === 'birthday'
                ? members.filter((m) => m.isBirthdayToday).length
                : t.id === 'welcome'
                ? Math.min(25, members.length)
                : members.filter((m) => m.status === 'active' && m.attendanceCountThisMonth <= 2).length;

            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setSearch('');
                  setIsBulkActive(false);
                  setBulkIndex(0);
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-on-surface">
          {/* BULK SEND QUICK ACTION BAR */}
          {!isBulkActive ? (
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#25D366]/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#25D366] text-xl">bolt</span>
                  <span className="font-sora font-bold text-sm text-on-surface">
                    {activeTab === 'renewal'
                      ? 'Send Bulk Renewal Reminder'
                      : activeTab === 'announcement'
                      ? 'Broadcast Gym Notice to All'
                      : `Bulk Send ${TEMPLATES.find((t) => t.id === activeTab)?.label}`}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#25D366]/20 text-[#15803d]">
                    {filteredMembers.length} Target Members
                  </span>
                </div>
                <p className="text-[11px] text-outline">
                  Sends personalized message with automatically replaced <span className="text-secondary font-bold">&#123;name&#125;</span> and <span className="text-secondary font-bold">&#123;plan&#125;</span> for each member.
                </p>
                {portalNoticeStatus && (
                  <p className="text-[11px] text-[#15803d] font-bold flex items-center gap-1 pt-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>{portalNoticeStatus}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleStartBulkSend}
                disabled={filteredMembers.length === 0 || isSavingToPortal}
                className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 text-[#002113] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                <span>
                  {isSavingToPortal
                    ? 'Preparing...'
                    : activeTab === 'renewal'
                    ? `Send All Reminders (${filteredMembers.length})`
                    : `Broadcast to All (${filteredMembers.length})`}
                </span>
              </button>
            </div>
          ) : (
            /* ACTIVE SEQUENTIAL SENDER QUEUE CARD */
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#25D366]/15 to-surface-container-lowest border-2 border-[#25D366]/50 shadow-md space-y-4 animate-in zoom-in-95">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#25D366]/30 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] animate-ping" />
                    <span className="font-sora font-extrabold text-sm sm:text-base text-on-surface">
                      Bulk WhatsApp Queue: Member {bulkIndex + 1} of {filteredMembers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-outline mt-0.5">
                    Tap to open WhatsApp with pre-filled message customized for this member.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <label className="flex items-center gap-1.5 text-[11px] text-outline cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAdvance}
                      onChange={(e) => setAutoAdvance(e.target.checked)}
                      className="rounded accent-[#25D366]"
                    />
                    <span>Auto-advance</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBulkActive(false)}
                    className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-bold text-outline hover:text-on-surface cursor-pointer"
                  >
                    Done / Exit Queue
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#25D366] h-full transition-all duration-300"
                  style={{
                    width: `${Math.round(((bulkIndex + 1) / filteredMembers.length) * 100)}%`,
                  }}
                />
              </div>

              {currentBulkMember ? (
                <div className="space-y-3 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
                  {/* Current Member Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-secondary/15 text-secondary font-sora font-bold flex items-center justify-center text-xs">
                        {currentBulkMember.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-sora font-bold text-sm text-on-surface flex items-center gap-2">
                          <span>{currentBulkMember.name}</span>
                          {sentMemberIds.has(currentBulkMember.id) && (
                            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-[#25D366]/20 text-[#15803d]">
                              ✓ Sent
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-outline flex items-center gap-2">
                          <span>{currentBulkMember.phone}</span>
                          <span>·</span>
                          <span className="text-secondary font-semibold">{currentBulkMember.planDuration}</span>
                          <span>·</span>
                          <span>{currentBulkMember.expiryDate}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-error">
                      {currentBulkMember.daysLeft <= 0
                        ? 'Expired'
                        : `${currentBulkMember.daysLeft} days left`}
                    </span>
                  </div>

                  {/* Personalized Message Preview */}
                  <div className="p-3 rounded-lg bg-surface-container text-xs text-on-surface space-y-1 border border-surface-container-high">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-outline flex items-center justify-between">
                      <span>Live Personalized Message</span>
                      <span className="text-[#15803d]">Auto-Filled</span>
                    </div>
                    <p className="leading-relaxed font-sans select-all">
                      {fillTokens(currentTemplate, currentBulkMember, gymName)}
                    </p>
                  </div>

                  {/* Actions for current member */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setBulkIndex((prev) => Math.max(0, prev - 1))}
                        disabled={bulkIndex === 0}
                        className="px-3 py-2 rounded-xl bg-surface-container disabled:opacity-40 text-on-surface font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                        <span>Previous</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkIndex((prev) => Math.min(filteredMembers.length - 1, prev + 1))}
                        disabled={bulkIndex >= filteredMembers.length - 1}
                        className="px-3 py-2 rounded-xl bg-surface-container disabled:opacity-40 text-on-surface font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Skip</span>
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBulkStepSend(currentBulkMember)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-[#002113] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      <span>Open WhatsApp & Send to {currentBulkMember.name.split(' ')[0]}</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-outline">
                  No members in queue.
                </div>
              )}
            </div>
          )}

          {/* Template Editor Box */}
          <div className="space-y-2 bg-surface-container-lowest p-3.5 rounded-xl border border-surface-container-high">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-outline flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#25D366]">edit_note</span>
                <span>Template ({TEMPLATES.find((t) => t.id === activeTab)?.label})</span>
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
              <span className="font-semibold text-on-surface-variant">Auto-Customized Tokens:</span>
              <code className="bg-surface-container px-1.5 py-0.5 rounded text-secondary font-bold">&#123;name&#125;</code>
              <code className="bg-surface-container px-1.5 py-0.5 rounded text-secondary font-bold">&#123;plan&#125;</code>
              <code className="bg-surface-container px-1 py-0.5 rounded text-outline">&#123;gym&#125;</code>
              <code className="bg-surface-container px-1 py-0.5 rounded text-outline">&#123;expiryDate&#125;</code>
              <code className="bg-surface-container px-1 py-0.5 rounded text-outline">&#123;daysLeft&#125;</code>
            </div>
          </div>

          {/* Member List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-outline text-xs">
                  Recipients ({filteredMembers.length})
                </span>
                {sentMemberIds.size > 0 && (
                  <span className="text-[10px] text-[#15803d] font-bold">
                    ({sentMemberIds.size} sent in this session)
                  </span>
                )}
              </div>
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-base">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name, phone, or plan..."
                  className="w-full bg-surface-container-lowest pl-8 pr-3 py-1.5 rounded-lg text-xs text-on-surface border border-surface-container-high focus:border-[#25D366] focus:outline-none"
                />
              </div>
            </div>

            <div className="border border-surface-container-high rounded-xl divide-y divide-surface-container-high max-h-72 overflow-y-auto bg-surface-container-lowest shadow-inner">
              {filteredMembers.map((member) => {
                const isSent = sentMemberIds.has(member.id);
                return (
                  <div
                    key={member.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-surface-container/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface truncate">{member.name}</span>
                        {isSent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#25D366]/20 text-[#15803d]">
                            ✓ Sent
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-outline flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span>{member.phone}</span>
                        <span>·</span>
                        <span className="text-secondary font-semibold">{member.planDuration || 'Plan'}</span>
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
                      type="button"
                      onClick={() => handleSendSingle(member)}
                      className="px-3 py-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold border border-[#25D366]/40 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
                      title={`Send WhatsApp message with auto-filled name (${member.name}) and plan (${member.planDuration})`}
                    >
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>Send</span>
                    </button>
                  </div>
                );
              })}
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
