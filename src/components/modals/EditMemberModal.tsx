import React, { useState } from 'react';
import { Member } from '../../types';

interface EditMemberModalProps {
  member: Member;
  onClose: () => void;
  onSave: (memberId: string, input: { name: string; phone: string; email: string }) => Promise<boolean>;
}

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1';
const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2 text-xs text-on-surface focus:outline-none transition-colors';

// Use with key={member.id} so the fields start from the right member each time
export const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, onClose, onSave }) => {
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone);
  const [email, setEmail] = useState(member.email);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSave(member.id, { name, phone, email });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-surface-container-low border border-secondary/40 rounded-xl p-6 space-y-4 text-xs text-on-surface"
      >
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
          <div>
            <h3 className="font-sora text-sm font-semibold">Edit member</h3>
            <p className="text-outline mt-0.5">{member.memberCode}</p>
          </div>
          <button type="button" onClick={onClose} className="text-outline hover:text-on-surface cursor-pointer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div>
          <label className={labelClass} htmlFor="edit-name">Name</label>
          <input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="edit-phone">Phone</label>
          <input id="edit-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="edit-email">Email (optional)</label>
          <input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container font-bold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
