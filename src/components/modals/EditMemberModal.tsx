import React, { useState } from 'react';
import { Member } from '../../types';

interface EditMemberModalProps {
  member: Member;
  onClose: () => void;
  onSave: (
    memberId: string,
    input: {
      name: string;
      phone: string;
      email: string;
      dob?: string | null;
      timingSlot?: 'MORNING' | 'EVENING' | 'BOTH' | string | null;
      weight?: number | null;
      height?: number | null;
      bmi?: number | null;
      bmiCategory?: string | null;
    }
  ) => Promise<boolean>;
}

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1';
const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2 text-xs text-on-surface focus:outline-none transition-colors';

// Use with key={member.id} so the fields start from the right member each time
export const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, onClose, onSave }) => {
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone);
  const [email, setEmail] = useState(member.email);
  const [dob, setDob] = useState(member.dob ? member.dob.slice(0, 10) : '');
  const [timingSlot, setTimingSlot] = useState<'MORNING' | 'EVENING' | 'BOTH' | string>(member.timingSlot || 'MORNING');
  const [weight, setWeight] = useState(member.weight ? String(member.weight) : '');
  const [height, setHeight] = useState(member.height ? String(member.height) : '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const w = parseFloat(weight) || null;
    const h = parseFloat(height) || null;
    let bmi: number | null = null;
    let bmiCategory: string | null = null;

    if (w && h && h > 50) {
      const hM = h / 100;
      bmi = Math.round((w / (hM * hM)) * 10) / 10;
      if (bmi < 18.5) bmiCategory = 'Underweight';
      else if (bmi < 25) bmiCategory = 'Normal';
      else if (bmi < 30) bmiCategory = 'Overweight';
      else bmiCategory = 'Obese';
    }

    const ok = await onSave(member.id, {
      name,
      phone,
      email,
      dob: dob || null,
      timingSlot,
      weight: w,
      height: h,
      bmi,
      bmiCategory,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-surface-container-low border border-secondary/40 rounded-xl p-6 space-y-4 text-xs text-on-surface max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
          <div>
            <h3 className="font-sora text-sm font-semibold">Edit Member Details</h3>
            <p className="text-outline mt-0.5">{member.memberCode} · {member.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-outline hover:text-on-surface cursor-pointer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div>
          <label className={labelClass} htmlFor="edit-name">Name</label>
          <input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="edit-phone">Phone</label>
            <input id="edit-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass} htmlFor="edit-email">Email (optional)</label>
            <input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5" htmlFor="edit-dob">
              <span className="material-symbols-outlined text-sm text-secondary">cake</span>
              <span>Date of Birth (DOB)</span>
            </label>
            <span className="text-[10px] text-outline font-medium">For wishing birthdays 🎂</span>
          </div>
          <input
            id="edit-dob"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Timing Slot */}
        <div>
          <label className={labelClass}>Workout Timing Slot</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'MORNING', label: '🌅 Morning Slot' },
              { key: 'EVENING', label: '🌇 Evening Slot' },
              { key: 'BOTH', label: '⚡ Flexible' },
            ].map((slot) => (
              <button
                key={slot.key}
                type="button"
                onClick={() => setTimingSlot(slot.key)}
                className={`py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                  timingSlot === slot.key
                    ? slot.key === 'MORNING'
                      ? 'bg-amber-500/25 border-amber-400 text-[#fde047] font-bold shadow-xs'
                      : 'bg-secondary/20 border-secondary text-secondary font-bold'
                    : 'bg-surface-container border-surface-container-high text-on-surface hover:text-white'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* BMI / Health metrics */}
        <div className="p-3 rounded-lg bg-surface-container border border-surface-container-high space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-[#4edea3]">monitor_weight</span>
            <span>Fitness &amp; BMI Metrics</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-outline block mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 72"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-[11px] text-outline block mb-1">Height (cm)</label>
              <input
                type="number"
                placeholder="e.g. 175"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-surface-container-high">
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
