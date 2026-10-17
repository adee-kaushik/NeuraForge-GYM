'use client';

import React, { useState, useEffect } from 'react';
import { Member } from '../../types';
import { sendMemberBirthdayWish } from '@/actions/reminders';

interface SendBirthdayWishModalProps {
  isOpen: boolean;
  member: Member | null;
  gymName: string;
  onClose: () => void;
  onToast?: (message: string) => void;
}

type BirthdayPreset = 'celebration' | 'gift' | 'short';

interface PresetOption {
  id: BirthdayPreset;
  label: string;
  icon: string;
  template: (name: string, gym: string) => string;
}

const PRESETS: PresetOption[] = [
  {
    id: 'celebration',
    label: 'Festive & Inspiring',
    icon: 'celebration',
    template: (name, gym) =>
      `🎉 Happy Birthday, ${name}! 🎂\n\nWishing you a fantastic day filled with joy, energy, and strength! Thank you for being such an inspiring part of our fitness family at ${gym}. May this year bring you closer to all your fitness milestones! 💪✨\n\n— Warm wishes from Team ${gym}`,
  },
  {
    id: 'gift',
    label: 'Birthday Treat',
    icon: 'redeem',
    template: (name, gym) =>
      `🎂 Happy Birthday, ${name}! 🎈\n\nTo celebrate your special day, we've got a birthday treat waiting for you at ${gym}! Stop by the reception today for a complimentary recovery drink or free guest pass. Have a blast! 🥤🏋️‍♂️\n\n— Team ${gym}`,
  },
  {
    id: 'short',
    label: 'Short & Energetic',
    icon: 'bolt',
    template: (name, gym) =>
      `Happy Birthday, ${name}! 🎂 Wishing you unstoppable energy, great health, and another strong year of progress from everyone at ${gym}! Keep crushing it! 🔥💪`,
  },
];

export const SendBirthdayWishModal: React.FC<SendBirthdayWishModalProps> = ({
  isOpen,
  member,
  gymName,
  onClose,
  onToast,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<BirthdayPreset>('celebration');
  const [message, setMessage] = useState('');
  const [savingAppNotification, setSavingAppNotification] = useState(false);
  const [appSentSuccess, setAppSentSuccess] = useState(false);

  useEffect(() => {
    if (member) {
      const preset = PRESETS.find((p) => p.id === selectedPreset) || PRESETS[0];
      setMessage(preset.template(member.name, gymName));
      setAppSentSuccess(false);
    }
  }, [member, selectedPreset, gymName]);

  if (!isOpen || !member) return null;

  const handleSelectPreset = (presetId: BirthdayPreset) => {
    setSelectedPreset(presetId);
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setMessage(preset.template(member.name, gymName));
    }
  };

  const cleanPhone = (phoneStr: string) => {
    const digits = phoneStr.replace(/[^0-9]/g, '');
    return digits.length === 10 ? `91${digits}` : digits;
  };

  const handleSendWhatsApp = () => {
    const phone = cleanPhone(member.phone);
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    if (onToast) onToast(`Opened WhatsApp with birthday wish for ${member.name}!`);
  };

  const handleSendToAppPass = async () => {
    setSavingAppNotification(true);
    try {
      const res = await sendMemberBirthdayWish(member.id, message);
      if (res.ok) {
        setAppSentSuccess(true);
        if (onToast) onToast(`Birthday wish posted to ${member.name}'s digital pass portal!`);
      } else if (res.error && onToast) {
        onToast(res.error);
      }
    } catch {
      if (onToast) onToast('Failed to post birthday wish to member pass.');
    } finally {
      setSavingAppNotification(false);
    }
  };

  const handleSendBoth = async () => {
    await handleSendToAppPass();
    handleSendWhatsApp();
  };

  const ageText = typeof member.age === 'number' ? `Turning ${member.age} years` : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-surface-container-low border border-primary/40 rounded-2xl shadow-[0_0_50px_rgba(148,125,255,0.25)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner accents */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-secondary"></div>
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-secondary"></div>
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-primary"></div>

        {/* Modal Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/30 to-secondary/30 text-secondary flex items-center justify-center border border-secondary/40 shadow-inner">
              <span className="material-symbols-outlined text-2xl">cake</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sora text-base font-semibold text-on-surface">
                  Wish Happy Birthday 🎂
                </h3>
                {member.isBirthdayToday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/40 animate-pulse">
                    Today!
                  </span>
                )}
              </div>
              <p className="text-xs text-outline">
                Send an editable celebratory message to {member.name}
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Member Card */}
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/40 shrink-0">
                {member.avatarInitials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-sora text-sm font-bold text-on-surface">{member.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container border border-surface-container-high text-outline font-mono">
                    {member.memberCode}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-outline mt-0.5">
                  <span>{member.phone}</span>
                  {member.dobFormatted && (
                    <>
                      <span>•</span>
                      <span className="text-secondary font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">calendar_month</span>
                        DOB: {member.dobFormatted}
                      </span>
                    </>
                  )}
                  {ageText && (
                    <>
                      <span>•</span>
                      <span className="text-primary font-medium">{ageText}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-2">
              Message Style / Templates
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESETS.map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`p-2.5 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/15 border-primary text-primary shadow-xs'
                        : 'bg-surface-container hover:bg-surface-container-high border-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base shrink-0">{p.icon}</span>
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editable Message Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-secondary">edit_note</span>
                <span>Customizable Birthday Message</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const preset = PRESETS.find((p) => p.id === selectedPreset);
                  if (preset) setMessage(preset.template(member.name, gymName));
                }}
                className="text-[11px] text-secondary hover:underline cursor-pointer"
              >
                Reset to default
              </button>
            </div>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a personalized birthday wish..."
              className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-xl p-3.5 text-xs text-on-surface leading-relaxed focus:outline-none transition-colors resize-none font-sans"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-outline">
              <span>You can edit this message anytime before sending.</span>
              <span>{message.length} characters</span>
            </div>
          </div>

          {/* Status Alert if already posted */}
          {appSentSuccess && (
            <div className="p-3 rounded-xl bg-tertiary/15 border border-tertiary/40 flex items-center gap-2 text-xs text-tertiary">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>Birthday wish has been posted to member's app digital pass!</span>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 bg-surface-container-lowest border-t border-surface-container-high flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Send to Member App Pass */}
            <button
              type="button"
              disabled={savingAppNotification || !message.trim()}
              onClick={handleSendToAppPass}
              className="px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Post notification directly into member digital pass portal"
            >
              <span className="material-symbols-outlined text-base">badge</span>
              <span>{savingAppNotification ? 'Posting...' : 'Send to Member App Pass'}</span>
            </button>

            {/* Send via WhatsApp */}
            <button
              type="button"
              disabled={!message.trim()}
              onClick={handleSendWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-[#001f28] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              title="Send directly to member on WhatsApp"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              <span>Send via WhatsApp</span>
            </button>

            {/* Send Both */}
            <button
              type="button"
              disabled={savingAppNotification || !message.trim()}
              onClick={handleSendBoth}
              className="px-4 py-2 rounded-xl bg-secondary text-[#001f28] hover:bg-secondary/90 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              title="Send to both WhatsApp and Member App Pass"
            >
              <span className="material-symbols-outlined text-base">send</span>
              <span>Send WhatsApp &amp; App</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
