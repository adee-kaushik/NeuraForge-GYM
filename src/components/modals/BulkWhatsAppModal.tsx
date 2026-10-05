import React, { useState } from 'react';
import { Member } from '../../types';

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onDispatched?: () => void;
}

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  members,
}) => {
  const expiringMembers = members.filter((m) => m.status === 'expiring' || m.daysLeft <= 7);
  const [selectedIds, setSelectedIds] = useState<string[]>(expiringMembers.map((m) => m.id));
  const [customMessage, setCustomMessage] = useState(
    'Hi {name}, your Iron Pulse Gym membership ({rank}) is expiring in {daysLeft} days on {expiryDate}. Renew before midnight to protect your Hunter Streak and lock in early-bird renewal rates! Reply RENEW to get the direct UPI payment link.'
  );
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === expiringMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(expiringMembers.map((m) => m.id));
    }
  };

  const handleDispatch = () => {
    setIsSending(true);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= selectedIds.length) {
        clearInterval(interval);
        setIsSending(false);
        setSentCount(selectedIds.length);
      }
    }, 120);
  };

  const sampleMember = expiringMembers[0] || {
    name: 'Rohit Sharma',
    rank: 'RANK A',
    daysLeft: 2,
    expiryDate: '26 Oct 2024',
  };

  const previewText = customMessage
    .replace('{name}', sampleMember.name)
    .replace('{rank}', sampleMember.rank)
    .replace('{daysLeft}', sampleMember.daysLeft.toString())
    .replace('{expiryDate}', sampleMember.expiryDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-surface-container-low border border-[#25D366]/40 rounded-xl shadow-[0_0_40px_rgba(37,211,102,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center border border-[#25D366]/40">
              <span className="material-symbols-outlined text-xl">chat</span>
            </div>
            <div>
              <h3 className="font-sora text-base font-semibold text-on-surface">
                Automated WhatsApp Renewal Dispatch
              </h3>
              <p className="text-xs text-outline">
                Official Meta Cloud API · Iron Pulse Indiranagar Business Node
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-on-surface">
          {/* Success banner */}
          {sentCount !== null && (
            <div className="p-3 rounded-lg bg-tertiary-container/20 border border-tertiary/40 text-tertiary flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span className="font-semibold">
                Success: {sentCount} WhatsApp renewal notices dispatched instantly!
              </span>
            </div>
          )}

          {/* Message Template Editor */}
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1.5">
              Message Template (Variables: {'{name}'}, {'{rank}'}, {'{daysLeft}'}, {'{expiryDate}'})
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-surface-container border border-surface-container-high focus:border-[#25D366] rounded-lg p-3 text-xs text-on-surface focus:outline-none transition-colors"
            />
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-surface-container-high relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-container-high">
              <span className="text-[0.6875rem] text-secondary font-bold uppercase tracking-wider">
                Live WhatsApp Preview
              </span>
              <span className="text-[0.625rem] text-outline">To: {sampleMember.name}</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
              {previewText}
            </p>
          </div>

          {/* Recipient Roster */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline">
                Target Cadre ({selectedIds.length} Selected)
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[0.6875rem] text-secondary hover:underline font-bold"
              >
                {selectedIds.length === expiringMembers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="border border-surface-container-high rounded-lg divide-y divide-surface-container-high max-h-44 overflow-y-auto bg-surface-container-lowest">
              {expiringMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => toggleSelect(member.id)}
                  className="p-2.5 flex items-center justify-between hover:bg-surface-container cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(member.id)}
                      onChange={() => {}}
                      className="rounded accent-[#25D366] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-on-surface">{member.name}</div>
                      <div className="text-[0.625rem] text-outline">{member.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[0.6875rem] px-2 py-0.5 rounded bg-primary/15 text-primary">
                      {member.rank}
                    </span>
                    <span className="text-[0.6875rem] px-2 py-0.5 rounded bg-error-container/40 text-error">
                      {member.daysLeft}d left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between">
          <div className="text-[0.6875rem] text-outline">
            Encrypted End-to-End · High Delivery Rate
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={isSending || selectedIds.length === 0}
              onClick={handleDispatch}
              className="px-5 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebc5a] text-[#002113] text-xs font-bold transition-all shadow-[0_0_16px_rgba(37,211,102,0.4)] disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSending ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                  <span>Dispatching Stream...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Send to {selectedIds.length} Members</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
