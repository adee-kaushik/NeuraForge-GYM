'use client';

import React, { useState } from 'react';
import type { CurrentUser, GymConfig } from '@/config/gym';

export interface GymRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  gym?: GymConfig;
  user?: CurrentUser;
}

export type RenewalPlanKey = 'base_1m' | 'base_6m' | 'base_1y' | 'pro_6m' | 'pro_1y';

interface PlanOption {
  key: RenewalPlanKey;
  tier: 'BASE' | 'PRO';
  name: string;
  durationLabel: string;
  price: number;
  bonusText?: string;
  customizationText: string;
  popular?: boolean;
}

const RENEWAL_PLANS: PlanOption[] = [
  // Base Plan options (no customization/modification)
  {
    key: 'base_1m',
    tier: 'BASE',
    name: '1 Month Demo',
    durationLabel: '1 Month Full Cloud Access',
    price: 999,
    customizationText: 'No customization / modification',
  },
  {
    key: 'base_6m',
    tier: 'BASE',
    name: '6 Months',
    durationLabel: '6 Months Full Cloud Access',
    price: 2399,
    bonusText: '+ 1 Month Free Demo (7 Months Total)',
    customizationText: 'No customization / modification',
    popular: true,
  },
  {
    key: 'base_1y',
    tier: 'BASE',
    name: '1 Year',
    durationLabel: '12 Months Full Cloud Access',
    price: 3499,
    bonusText: '+ 1 Month Free Demo (13 Months Total)',
    customizationText: 'No customization / modification',
  },
  // Pro Plan options (customization and personalization)
  {
    key: 'pro_6m',
    tier: 'PRO',
    name: '6 Months Pro',
    durationLabel: '6 Months Cloud + Priority Support',
    price: 3499,
    customizationText: '1 Customization Free & Full Personalization',
  },
  {
    key: 'pro_1y',
    tier: 'PRO',
    name: '1 Year Pro',
    durationLabel: '12 Months Cloud + Priority Support',
    price: 5499,
    customizationText: '2 Customizations Free & Full Personalization',
    popular: true,
  },
];

export const GymRenewalModal: React.FC<GymRenewalModalProps> = ({
  isOpen,
  onClose,
  gym,
  user,
}) => {
  const [selectedTier, setSelectedTier] = useState<'BASE' | 'PRO'>('BASE');
  const [selectedPlanKey, setSelectedPlanKey] = useState<RenewalPlanKey>('base_6m');
  const [showQr, setShowQr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen) return null;

  const gymName = gym?.name || 'Your Gym';
  const ownerName = user?.name || 'Gym Owner';
  const upiId = 'neuraforge@icici'; // Official NeuraFitness Co-Founders UPI

  const activePlans = RENEWAL_PLANS.filter((p) => p.tier === selectedTier);
  const currentPlan = RENEWAL_PLANS.find((p) => p.key === selectedPlanKey) || activePlans[0];

  const handleSelectTier = (tier: 'BASE' | 'PRO') => {
    setSelectedTier(tier);
    if (tier === 'BASE') setSelectedPlanKey('base_6m');
    else setSelectedPlanKey('pro_6m');
  };

  const handleWhatsAppRenew = () => {
    const text = encodeURIComponent(
      `Hi NeuraFitness Co-Founders, I would like to renew our gym SaaS subscription for "${gymName}".\n\n` +
      `Owner: ${ownerName}\n` +
      `Selected Plan: ${currentPlan.name} (${selectedTier === 'BASE' ? 'Base Plan' : 'Pro Plan'})\n` +
      `Price: ₹${currentPlan.price.toLocaleString('en-IN')}/-\n` +
      `${currentPlan.bonusText ? `Offer: ${currentPlan.bonusText}\n` : ''}` +
      `Features: ${currentPlan.customizationText}\n\n` +
      `Please confirm renewal and share the invoice/acknowledgement.`
    );
    window.open(`https://api.whatsapp.com/send?phone=919876543210&text=${text}`, '_blank');
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const upiPayUrl = `upi://pay?pa=${upiId}&pn=NeuraFitness&am=${currentPlan.price}&tn=${encodeURIComponent(`Renewal-${gymName}-${currentPlan.key}`)}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiPayUrl)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-surface-container-low border border-secondary/40 rounded-2xl shadow-[0_0_60px_rgba(123,208,255,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header with Cross Button */}
        <div className="px-5 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center border border-secondary/30">
              <span className="material-symbols-outlined text-2xl">autorenew</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sora text-sm sm:text-base font-bold text-on-surface">
                  Renew Gym Subscription
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/20 text-secondary border border-secondary/40 uppercase">
                  Co-Founder Direct
                </span>
              </div>
              <p className="text-[11px] text-outline mt-0.5">
                Keep biometric attendance turnstiles, digital pass scanning &amp; cloud member CRM active for {gymName}
              </p>
            </div>
          </div>
          {/* Top-Right Cross Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Tier Switcher Tabs: Base Plan vs Pro Plan */}
          <div className="grid grid-cols-2 p-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-bold">
            <button
              type="button"
              onClick={() => handleSelectTier('BASE')}
              className={`py-2.5 px-3 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                selectedTier === 'BASE'
                  ? 'bg-secondary text-on-secondary shadow-md'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>1. Base Plan</span>
              </div>
              <span className="text-[10px] font-normal opacity-90">
                (No customization / modification)
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTier('PRO')}
              className={`py-2.5 px-3 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                selectedTier === 'PRO'
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">star</span>
                <span>2. Pro Plan</span>
              </div>
              <span className="text-[10px] font-normal opacity-90">
                (Customization &amp; personalization)
              </span>
            </button>
          </div>

          {/* Tier Description Badge */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
              selectedTier === 'BASE'
                ? 'bg-secondary/10 border-secondary/30 text-on-surface'
                : 'bg-primary/10 border-primary/30 text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg shrink-0 text-secondary">
              {selectedTier === 'BASE' ? 'check_circle' : 'bolt'}
            </span>
            <div className="text-[11px] leading-relaxed">
              {selectedTier === 'BASE' ? (
                <>
                  <strong className="text-secondary">Base Plan:</strong> Full NeuraFitness SaaS suite with biometric turnstile sync, digital member passes, attendance tracking &amp; WhatsApp templates. <em>Standard ready-to-use software (no custom code changes).</em>
                </>
              ) : (
                <>
                  <strong className="text-primary">Pro Plan:</strong> Complete NeuraFitness platform plus <em>bespoke software customization and gym personalization</em> to match your exact brand guidelines and specialized workflows.
                </>
              )}
            </div>
          </div>

          {/* Plan Options Grid */}
          <div className="space-y-2.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-outline">
              Select Plan Duration
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activePlans.map((plan) => {
                const isSelected = selectedPlanKey === plan.key;
                return (
                  <div
                    key={plan.key}
                    onClick={() => setSelectedPlanKey(plan.key)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? selectedTier === 'BASE'
                          ? 'border-secondary bg-secondary/15 ring-2 ring-secondary/40 shadow-md'
                          : 'border-primary bg-primary/15 ring-2 ring-primary/40 shadow-md'
                        : 'border-surface-container-high bg-surface-container-lowest hover:border-surface-container-highest'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.2 rounded-full bg-secondary text-on-secondary text-[9px] font-black uppercase tracking-wider">
                        Popular
                      </span>
                    )}
                    <div>
                      <h4 className="font-sora font-bold text-sm text-on-surface">{plan.name}</h4>
                      <p className="text-[10px] text-outline mt-0.5">{plan.durationLabel}</p>

                      <div className="mt-2.5">
                        <span className="font-sora text-xl font-extrabold text-on-surface">
                          ₹{plan.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-outline font-semibold">/-</span>
                      </div>

                      {plan.bonusText && (
                        <div className="mt-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold inline-block">
                          {plan.bonusText}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-surface-container-high/60 text-[10px] font-semibold text-outline">
                      {plan.customizationText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary & Payment Options */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-outline block">
                  Selected Subscription
                </span>
                <p className="font-sora font-bold text-sm text-on-surface mt-0.5">
                  {currentPlan.name} · {selectedTier === 'BASE' ? 'Base Plan' : 'Pro Plan'}
                </p>
                {currentPlan.bonusText && (
                  <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                    🎉 {currentPlan.bonusText}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-outline block">
                  Amount Payable
                </span>
                <span className="font-sora text-2xl font-black text-secondary">
                  ₹{currentPlan.price.toLocaleString('en-IN')}/-
                </span>
              </div>
            </div>

            {/* Toggle UPI QR */}
            <div className="pt-2 border-t border-surface-container-high flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="text-xs text-secondary hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">qr_code_2</span>
                <span>{showQr ? 'Hide Instant UPI QR' : 'Show Instant UPI QR Code'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyUpi}
                className="text-[11px] text-outline hover:text-on-surface font-mono flex items-center gap-1 cursor-pointer"
              >
                <span>UPI ID: {upiId}</span>
                <span className="material-symbols-outlined text-xs">
                  {copiedUpi ? 'check' : 'content_copy'}
                </span>
                {copiedUpi && <span className="text-secondary font-bold">Copied!</span>}
              </button>
            </div>

            {/* QR Code display */}
            {showQr && (
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row items-center gap-4 animate-in fade-in">
                <img
                  src={qrUrl}
                  alt="UPI QR Code"
                  className="w-32 h-32 rounded-lg bg-white p-2 border border-surface-container-high shadow-md shrink-0"
                />
                <div className="space-y-1.5 text-center sm:text-left">
                  <h5 className="font-bold text-xs text-on-surface">Scan with any UPI App</h5>
                  <p className="text-[11px] text-outline">
                    Google Pay, PhonePe, Paytm, or BHIM. Amount ₹{currentPlan.price.toLocaleString('en-IN')} will auto-fill.
                  </p>
                  <p className="text-[10px] text-secondary font-bold">
                    After payment, click &quot;Confirm on WhatsApp&quot; below for instant activation.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-outline hover:text-on-surface text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleWhatsAppRenew}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Confirm &amp; Renew on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
