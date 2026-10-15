'use client';

import React, { useState, useRef } from 'react';
import { updateGymBanner } from '@/actions/settings';
import type { GymConfig } from '@/config/gym';

interface GymBannerProps {
  gym: GymConfig;
  onGymUpdate?: (updatedGym: GymConfig) => void;
  canEdit?: boolean;
}

const BANNER_PRESETS = [
  {
    name: 'Modern Athletic Club',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Dark Obsidian Iron Den',
    url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1600&auto=format&fit=crop&q=80',
  },
  {
    name: 'High-Velocity CrossFit Arena',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Luxury Fitness & Wellness',
    url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Urban Strength Studio',
    url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1600&auto=format&fit=crop&q=80',
  },
];

export const GymBanner: React.FC<GymBannerProps> = ({ gym, onGymUpdate, canEdit = true }) => {
  const [currentBanner, setCurrentBanner] = useState<string>(
    gym.bannerUrl || BANNER_PRESETS[0].url
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewBanner, setPreviewBanner] = useState<string>(currentBanner);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setStatusMessage({ text: 'Banner image must be under 8MB.', isError: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewBanner(reader.result);
        setStatusMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async () => {
    if (!previewBanner) return;
    setIsSaving(true);
    setStatusMessage(null);

    const res = await updateGymBanner(previewBanner);
    setIsSaving(false);

    if (res.ok) {
      setCurrentBanner(previewBanner);
      if (onGymUpdate) {
        onGymUpdate({ ...gym, bannerUrl: previewBanner });
      }
      setStatusMessage({ text: 'Gym banner updated successfully!' });
      setTimeout(() => {
        setIsModalOpen(false);
        setStatusMessage(null);
      }, 1000);
    } else {
      setStatusMessage({ text: res.error || 'Failed to update gym banner.', isError: true });
    }
  };

  return (
    <>
      <div className="relative w-full rounded-3xl overflow-hidden border border-surface-container-high shadow-lg bg-surface-container-lowest">
        {/* Banner Graphic with Dark Contrast Layer */}
        <div className="relative h-48 sm:h-64 lg:h-72 w-full overflow-hidden">
          <img
            src={currentBanner}
            alt={`${gym.name} Banner`}
            className="w-full h-full object-cover brightness-[0.75] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />

          {/* Top Left Gym Code badge & Top Right Change Banner Button */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-mono font-bold text-white shadow-xs">
                🏢 Code: <span className="text-secondary">{gym.slug}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary/20 backdrop-blur-md border border-tertiary/40 text-[11px] font-bold text-[#4edea3]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                <span>Active Facility</span>
              </span>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setPreviewBanner(currentBanner);
                  setIsModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-black/55 hover:bg-black/85 backdrop-blur-md border border-white/20 hover:border-white/40 text-xs font-bold text-white hover:text-secondary transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base">photo_camera</span>
                <span className="hidden sm:inline">Change Gym Banner</span>
              </button>
            )}
          </div>

          {/* Banner Hero Text & Gym Information */}
          <div className="absolute bottom-5 left-5 right-5 z-10 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-secondary bg-secondary/25 px-2.5 py-0.5 rounded-md backdrop-blur-sm border border-secondary/35">
                Headquarters
              </span>
              <h1 className="font-sora text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-md mt-1.5">
                {gym.name}
              </h1>
              <p className="text-xs sm:text-sm text-white/85 font-medium mt-1 max-w-xl">
                {gym.tagline || (gym.address ? `📍 ${gym.address}` : 'Official Fitness Management Portal')}
              </p>
            </div>

            {gym.address && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 text-xs text-white/90">
                <span className="material-symbols-outlined text-sm text-secondary">location_on</span>
                <span className="truncate max-w-xs">{gym.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="w-full max-w-lg bg-surface-container-lowest border border-surface-container-high rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-2xl">panorama</span>
                <div>
                  <h3 className="font-sora font-bold text-base text-on-surface">Customize Gym Banner</h3>
                  <p className="text-xs text-outline">Displayed to staff and members across both portals</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Banner Preview */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-outline">Live Banner Preview</p>
              <div className="relative h-44 rounded-2xl overflow-hidden border-2 border-surface-container-high shadow-md">
                <img src={previewBanner} alt="Preview" className="w-full h-full object-cover brightness-[0.75]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-secondary bg-black/60 px-2 py-0.5 rounded border border-white/20">
                      {gym.slug}
                    </span>
                    <h4 className="font-sora font-bold text-lg text-white mt-1">{gym.name}</h4>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Custom Image */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-xs font-bold text-on-surface flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg text-secondary">upload_file</span>
                <span>Upload Custom Gym Photo / Banner</span>
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-outline">
                Or Select from Premium Fitness Themes
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {BANNER_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPreviewBanner(p.url);
                      setStatusMessage(null);
                    }}
                    className={`group relative h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer text-left ${
                      previewBanner === p.url
                        ? 'border-secondary ring-2 ring-secondary/30 scale-[1.02]'
                        : 'border-surface-container-high opacity-80 hover:opacity-100 hover:border-secondary/60'
                    }`}
                  >
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover brightness-[0.7]" />
                    <span className="absolute inset-0 bg-black/30 flex items-end p-1.5 text-[10px] font-bold text-white leading-tight">
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  statusMessage.isError
                    ? 'bg-error/10 text-error border border-error/20'
                    : 'bg-tertiary/10 text-tertiary border border-tertiary/20'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {statusMessage.isError ? 'error' : 'check_circle'}
                </span>
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-surface-container-high">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !previewBanner || previewBanner === currentBanner}
                onClick={handleSaveBanner}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold disabled:opacity-50 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Gym Banner</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
