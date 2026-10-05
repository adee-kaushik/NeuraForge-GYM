import React, { useState } from 'react';

export const SettingsView: React.FC = () => {
  const [gymName, setGymName] = useState('Iron Pulse Gym');
  const [address, setAddress] = useState('100ft Road, Indiranagar, Bengaluru 560038');
  const [gstNumber, setGstNumber] = useState('29AAAAA0000A1Z5');
  const [xpGoal, setXpGoal] = useState('500000');
  const [autoWhatsApp, setAutoWhatsApp] = useState(true);
  const [gate1Ip, setGate1Ip] = useState('192.168.1.104');
  const [gate2Ip, setGate2Ip] = useState('192.168.1.108');
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
            <span className="material-symbols-outlined text-secondary text-2xl">
              settings
            </span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">
              Tactical Operations &amp; Facility Settings
            </h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Hardware gate configurations, Meta WhatsApp API endpoints, and Solo Leveling XP quests
          </p>
        </div>

        {savedAlert && (
          <div className="px-3.5 py-1.5 rounded-lg bg-tertiary-container/20 border border-tertiary/40 text-tertiary text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-on-surface">
        {/* Domain Facility Profile */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-surface-container-high">
            <span className="material-symbols-outlined text-primary text-xl">fitness_center</span>
            <h3 className="font-sora text-sm font-semibold text-on-surface">
              Facility &amp; Business Profile
            </h3>
          </div>

          <div>
            <label className="block text-[0.6875rem] font-bold uppercase text-outline mb-1">
              Gym / Guild Name
            </label>
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg p-2.5 text-on-surface focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[0.6875rem] font-bold uppercase text-outline mb-1">
              Physical Domain Address (Indiranagar)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg p-2.5 text-on-surface focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[0.6875rem] font-bold uppercase text-outline mb-1">
              GSTIN Tax Identification
            </label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg p-2.5 text-on-surface font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[0.6875rem] font-bold uppercase text-outline mb-1">
              Monthly Revenue XP Target (₹ INR)
            </label>
            <input
              type="number"
              value={xpGoal}
              onChange={(e) => setXpGoal(e.target.value)}
              className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg p-2.5 text-on-surface font-mono focus:outline-none"
            />
            <span className="text-[0.625rem] text-outline mt-1 block">
              Current progress unlocks Level 5 Trainer Incentive Pool
            </span>
          </div>
        </div>

        {/* Biometric Gates & Automation */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-surface-container-high">
            <span className="material-symbols-outlined text-secondary text-xl">router</span>
            <h3 className="font-sora text-sm font-semibold text-on-surface">
              Hardware Biometrics &amp; Turnstiles
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase text-outline mb-1">
                Gate 1 Turnstile IP
              </label>
              <input
                type="text"
                value={gate1Ip}
                onChange={(e) => setGate1Ip(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2.5 text-secondary font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase text-outline mb-1">
                Gate 2 Iron Zone IP
              </label>
              <input
                type="text"
                value={gate2Ip}
                onChange={(e) => setGate2Ip(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2.5 text-secondary font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-surface-container-high">
            <h4 className="text-xs font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#25D366] text-lg">chat</span>
              <span>Automated WhatsApp Dispatch Daemon</span>
            </h4>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
              <div>
                <p className="font-semibold text-xs text-on-surface">
                  48-Hour Critical Expiry Trigger
                </p>
                <p className="text-[0.6875rem] text-outline">
                  Automatically queue WhatsApp renewal messages for members with &le; 2 days left
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoWhatsApp}
                onChange={(e) => setAutoWhatsApp(e.target.checked)}
                className="accent-[#25D366] w-5 h-5 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold transition-all shadow-[0_0_16px_rgba(148,125,255,0.35)] cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
