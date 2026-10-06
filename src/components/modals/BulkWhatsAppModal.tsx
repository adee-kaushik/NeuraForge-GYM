import React, { useState } from 'react';
import { Member } from '../../types';

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
}

const fill = (template: string, m: Member) =>
  template
    .replace(/\{name\}/g, m.name)
    .replace(/\{plan\}/g, m.planDuration)
    .replace(/\{daysLeft\}/g, String(m.daysLeft))
    .replace(/\{expiryDate\}/g, m.expiryDate);

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({ isOpen, onClose, members }) => {
  const [template, setTemplate] = useState(
    'Hi {name}, your Iron Pulse Gym {plan} membership expires in {daysLeft} days on {expiryDate}. Please renew to keep your membership active.'
  );

  if (!isOpen) return null;

  const expiringMembers = members.filter((m) => m.status === 'expiring' || m.daysLeft <= 7);

  const send = (m: Member) => {
    const phone = m.phone.replace(/[^0-9]/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(fill(template, m))}`, '_blank');
  };

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
              <h3 className="font-sora text-base font-semibold text-on-surface">Send Renewal Reminders</h3>
              <p className="text-xs text-outline">WhatsApp opens with the message ready. Just press send.</p>
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
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-on-surface">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1.5">
              Message ({'{name}'}, {'{plan}'}, {'{daysLeft}'} and {'{expiryDate}'} are filled in for each member)
            </label>
            <textarea
              rows={3}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full bg-surface-container border border-surface-container-high focus:border-[#25D366] rounded-lg p-3 text-xs text-on-surface focus:outline-none transition-colors"
            />
          </div>

          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-outline mb-2">
              Members expiring soon ({expiringMembers.length})
            </span>
            <div className="border border-surface-container-high rounded-lg divide-y divide-surface-container-high max-h-64 overflow-y-auto bg-surface-container-lowest">
              {expiringMembers.map((member) => (
                <div key={member.id} className="p-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-on-surface">{member.name}</div>
                    <div className="text-xs text-outline">
                      {member.phone} · {member.planDuration} · {member.daysLeft} days left
                    </div>
                  </div>
                  <button
                    onClick={() => send(member)}
                    className="px-3 py-1 rounded bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-[#002113] text-xs font-bold border border-[#25D366]/30 transition-all cursor-pointer shrink-0"
                  >
                    Send on WhatsApp
                  </button>
                </div>
              ))}
              {expiringMembers.length === 0 && (
                <div className="p-4 text-center text-outline">No memberships are expiring soon.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
