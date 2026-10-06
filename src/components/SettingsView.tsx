import React, { useState } from 'react';

const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg p-2.5 text-on-surface focus:outline-none';
const labelClass = 'block text-xs font-bold uppercase text-outline mb-1';

export const SettingsView: React.FC = () => {
  const [gymName, setGymName] = useState('Iron Pulse Gym');
  const [address, setAddress] = useState('Malviya Nagar, Jaipur');
  const [gstNumber, setGstNumber] = useState('');
  const [revenueGoal, setRevenueGoal] = useState('500000');
  const [savedAlert, setSavedAlert] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
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

        {savedAlert && (
          <div className="px-3.5 py-1.5 rounded-lg bg-tertiary-container/20 border border-tertiary/40 text-tertiary text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Settings saved!</span>
          </div>
        )}
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
