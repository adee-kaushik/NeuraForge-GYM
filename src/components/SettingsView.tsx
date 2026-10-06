import React, { useState } from 'react';
import { GymConfig } from '../config/gym';

const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg p-2.5 text-on-surface focus:outline-none';
const labelClass = 'block text-xs font-bold uppercase text-outline mb-1';

interface SettingsViewProps {
  gym: GymConfig;
  onSave: (next: GymConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ gym, onSave }) => {
  const [gymName, setGymName] = useState(gym.name);
  const [address, setAddress] = useState(gym.address);
  const [gstNumber, setGstNumber] = useState(gym.gstNumber);
  const [revenueGoal, setRevenueGoal] = useState(String(gym.monthlyRevenueGoal));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = gymName.trim() || gym.name;
    const goal = parseInt(revenueGoal, 10);
    onSave({
      ...gym,
      name,
      shortName: name.replace(/\s+gym$/i, ''),
      initials:
        name
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || gym.initials,
      address: address.trim(),
      gstNumber: gstNumber.trim().toUpperCase(),
      monthlyRevenueGoal: Number.isFinite(goal) && goal > 0 ? goal : gym.monthlyRevenueGoal,
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">settings</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Settings</h1>
          </div>
          <p className="text-xs text-outline mt-1">Your gym details and monthly goal</p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="max-w-2xl p-5 rounded-xl bg-surface-container-low border border-surface-container-high space-y-4 text-xs text-on-surface"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-surface-container-high">
          <span className="material-symbols-outlined text-primary text-xl">fitness_center</span>
          <h3 className="font-sora text-sm font-semibold text-on-surface">Gym Details</h3>
        </div>

        <div>
          <label className={labelClass}>Gym name</label>
          <input type="text" value={gymName} onChange={(e) => setGymName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>GST number (optional)</label>
          <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Monthly revenue goal (₹)</label>
          <input type="number" value={revenueGoal} onChange={(e) => setRevenueGoal(e.target.value)} className={inputClass} />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold transition-all shadow-[0_0_16px_rgba(148,125,255,0.35)] cursor-pointer"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};
