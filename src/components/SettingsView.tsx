import React, { useState } from 'react';
import { GymConfig, GymSettingsInput } from '../config/gym';
import { StaffSection } from './StaffSection';

const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg p-2.5 text-on-surface focus:outline-none';
const labelClass = 'block text-xs font-bold uppercase text-outline mb-1';

interface SettingsViewProps {
  gym: GymConfig;
  onSave: (input: GymSettingsInput) => Promise<boolean>;
  isOwner: boolean; // only the owner manages staff
}

export const SettingsView: React.FC<SettingsViewProps> = ({ gym, onSave, isOwner }) => {
  const [gymName, setGymName] = useState(gym.name);
  const [gymCode, setGymCode] = useState(gym.slug || '');
  const [address, setAddress] = useState(gym.address);
  const [gstNumber, setGstNumber] = useState(gym.gstNumber);
  const [revenueGoal, setRevenueGoal] = useState(String(gym.monthlyRevenueGoal));
  const [upiId, setUpiId] = useState(gym.upiId || '');
  const [paymentQrUrl, setPaymentQrUrl] = useState(gym.paymentQrUrl || '');

  const [saving, setSaving] = useState(false);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPaymentQrUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const goal = parseInt(revenueGoal, 10);

    setSaving(true);
    await onSave({
      name: gymName,
      slug: gymCode,
      address,
      gstNumber,
      monthlyRevenueGoal: Number.isFinite(goal) && goal >= 0 ? goal : -1,
      upiId,
      paymentQrUrl,
    });
    setSaving(false);
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
          <p className="text-xs text-outline mt-1">Your gym details, payment UPI QR, and monthly goal</p>
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
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Unique Gym Code</label>
            <span className="text-[10px] font-mono text-secondary font-bold">Member Login Code</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={gymCode}
              onChange={(e) =>
                setGymCode(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]/g, '-')
                    .replace(/-+/g, '-')
                )
              }
              placeholder="e.g. iron-fitness"
              className={`${inputClass} font-mono`}
            />
          </div>
          <p className="text-[11px] text-outline mt-1 leading-relaxed">
            Your members enter this code + their phone number at{' '}
            <span className="text-secondary font-mono">/member/login</span> to access their digital pass. Must be unique.
          </p>
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

        {/* UPI & Payment QR Section */}
        <div className="pt-3 border-t border-surface-container-high space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">qr_code_2</span>
            <h4 className="font-sora text-xs font-bold text-on-surface uppercase tracking-wider">
              Member Payment UPI &amp; QR Code
            </h4>
          </div>
          <p className="text-outline text-[11px]">
            Add your gym&apos;s UPI ID and QR code image. This will be displayed in the logged-in Member Portal so members can scan and pay their dues directly.
          </p>

          <div>
            <label className={labelClass}>Gym UPI ID (e.g. yourname@okhdfcbank or 9876543210@upi)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. gymname@upi"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Upload UPI QR Code Image (or enter Image URL)</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-secondary font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors">
                <span className="material-symbols-outlined text-base">upload</span>
                <span>Choose QR Image File</span>
                <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
              </label>

              <span className="text-[11px] text-outline">or paste URL:</span>

              <input
                type="text"
                value={paymentQrUrl}
                onChange={(e) => setPaymentQrUrl(e.target.value)}
                placeholder="https://.../my-qr.png or data:image/..."
                className="flex-1 bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg p-2 text-on-surface focus:outline-none text-xs"
              />
            </div>

            {/* QR Preview */}
            {paymentQrUrl && (
              <div className="mt-3 p-3 bg-surface-container rounded-xl border border-surface-container-high inline-flex flex-col items-center gap-2">
                <span className="text-[10px] text-outline font-bold uppercase">QR Code Preview</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paymentQrUrl}
                  alt="Gym UPI QR Code"
                  className="w-36 h-36 object-contain rounded-lg border border-surface-container-high bg-white p-1"
                />
                <button
                  type="button"
                  onClick={() => setPaymentQrUrl('')}
                  className="text-xs text-error hover:underline font-bold"
                >
                  Remove QR
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold transition-all shadow-[0_0_16px_rgba(148,125,255,0.35)] cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {isOwner && <StaffSection />}
    </div>
  );
};
