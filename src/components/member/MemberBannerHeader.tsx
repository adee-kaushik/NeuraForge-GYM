'use client';

import React, { useState, useRef } from 'react';
import { logoutMember, updateMemberProfilePhoto } from '@/app/member/actions';

interface MemberBannerHeaderProps {
  gymName: string;
  gymSlug: string;
  gymBannerUrl?: string | null;
  gymTagline?: string | null;
  memberName: string;
  memberPhone: string;
  memberPhotoUrl?: string | null;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80',
];

export const MemberBannerHeader: React.FC<MemberBannerHeaderProps> = ({
  gymName,
  gymSlug,
  gymBannerUrl,
  gymTagline,
  memberName,
  memberPhone,
  memberPhotoUrl,
}) => {
  const [photo, setPhoto] = useState<string | null>(memberPhotoUrl || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(photo);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = memberName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ text: 'Image size should be under 5MB.', isError: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewPhoto(reader.result);
        setStatusMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!previewPhoto) return;
    setIsSaving(true);
    setStatusMessage(null);

    const res = await updateMemberProfilePhoto(previewPhoto);
    setIsSaving(false);

    if (res.ok) {
      setPhoto(previewPhoto);
      setStatusMessage({ text: 'Profile picture updated successfully!' });
      setTimeout(() => {
        setIsModalOpen(false);
        setStatusMessage(null);
      }, 1000);
    } else {
      setStatusMessage({ text: res.error || 'Failed to update photo', isError: true });
    }
  };

  const fallbackBanner =
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80';
  const effectiveBanner = gymBannerUrl || fallbackBanner;

  return (
    <>
      {/* Gym Banner Container */}
      <div className="relative rounded-3xl overflow-hidden border border-surface-container-high shadow-md bg-surface-container-lowest">
        {/* Banner Image with dark overlay for maximum contrast */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden">
          <img
            src={effectiveBanner}
            alt={`${gymName} Banner`}
            className="w-full h-full object-cover brightness-[0.72] contrast-[1.08]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25 backdrop-blur-[0.5px]" />

          {/* Top Bar on Banner: Gym Code & Logout */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-mono font-bold text-white shadow-xs">
              ⚡ Pass: {gymSlug}
            </span>
            <form action={logoutMember}>
              <button
                type="submit"
                className="px-3 py-1 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-xs font-bold text-white hover:text-secondary transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span>Log out</span>
              </button>
            </form>
          </div>

          {/* Gym Name & Tagline at bottom of banner */}
          <div className="absolute bottom-3 left-4 right-4 z-10 text-white">
            <span className="text-[10px] uppercase tracking-widest text-secondary font-bold bg-secondary/20 px-2 py-0.5 rounded-md backdrop-blur-sm border border-secondary/30">
              Official Member Portal
            </span>
            <h1 className="font-sora text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm mt-1">
              {gymName}
            </h1>
            <p className="text-xs text-white/80 line-clamp-1 mt-0.5 font-medium">
              {gymTagline || 'Train hard · Stay consistent · Level up your life'}
            </p>
          </div>
        </div>

        {/* Member Profile Avatar Bar */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4 bg-surface-container-lowest">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Interactive Avatar with upload trigger */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPreviewPhoto(photo);
                  setIsModalOpen(true);
                }}
                className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-secondary/50 shadow-md flex items-center justify-center bg-gradient-to-tr from-secondary/30 to-primary/20 cursor-pointer group-hover:border-secondary transition-all"
                title="Click to change your profile picture"
              >
                {photo ? (
                  <img src={photo} alt={memberName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-sora font-extrabold text-xl text-on-surface">{initials}</span>
                )}
                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <span className="material-symbols-outlined text-xl">photo_camera</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewPhoto(photo);
                  setIsModalOpen(true);
                }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-sm border border-surface-container-lowest cursor-pointer hover:scale-110 transition-transform"
                title="Change Photo"
              >
                <span className="material-symbols-outlined text-[13px]">edit</span>
              </button>
            </div>

            {/* Member Welcome & ID */}
            <div className="min-w-0">
              <h2 className="font-sora text-lg sm:text-xl font-bold text-on-surface truncate">
                Hi, {memberName.split(' ')[0]} 👋
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-outline mt-0.5 font-mono truncate">
                <span>Phone:</span>
                <span className="font-bold text-on-surface">{memberPhone}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewPhoto(photo);
                  setIsModalOpen(true);
                }}
                className="text-[11px] font-bold text-secondary hover:underline flex items-center gap-1 mt-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">add_a_photo</span>
                <span>{photo ? 'Change Profile Picture' : 'Add Profile Picture'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Picture Upload Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-surface-container-lowest border border-surface-container-high rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">account_circle</span>
                <h3 className="font-sora font-bold text-base text-on-surface">Member Profile Photo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Preview Section */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="relative w-28 h-28 rounded-3xl overflow-hidden border-4 border-secondary/40 shadow-lg bg-surface-container flex items-center justify-center">
                {previewPhoto ? (
                  <img src={previewPhoto} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-sora font-bold text-3xl text-outline">{initials}</span>
                )}
              </div>
              <p className="text-xs text-outline text-center">
                This photo will be displayed on your digital pass and at front desk attendance.
              </p>
            </div>

            {/* Action 1: Upload from device */}
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
                className="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-xs font-bold text-on-surface flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-secondary">upload_file</span>
                <span>Upload from Device / Camera</span>
              </button>
            </div>

            {/* Action 2: Choose preset avatars */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2">
                Or pick an athlete avatar
              </p>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPreviewPhoto(preset);
                      setStatusMessage(null);
                    }}
                    className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${
                      previewPhoto === preset
                        ? 'border-secondary ring-2 ring-secondary/30 scale-105'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Status message */}
            {statusMessage && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                  statusMessage.isError
                    ? 'bg-error/10 text-error border border-error/20'
                    : 'bg-tertiary/10 text-tertiary border border-tertiary/20'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {statusMessage.isError ? 'error' : 'check_circle'}
                </span>
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !previewPhoto || previewPhoto === photo}
                onClick={handleSavePhoto}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold disabled:opacity-50 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Photo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
