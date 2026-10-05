import React, { useState } from 'react';
import { MembershipPlan } from '../types';
import { MEMBERSHIP_PLANS } from '../data/mockData';

export const MembershipsView: React.FC = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>(MEMBERSHIP_PLANS);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState<string | null>(null);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (discountCode.trim().toUpperCase() === 'TITAN20') {
      setDiscountApplied('20% Tactical Discount applied to all tier subscriptions!');
    } else if (discountCode.trim().toUpperCase() === 'IRON500') {
      setDiscountApplied('₹500 Instant Cash Credit applied!');
    } else {
      setDiscountApplied(`Promo code "${discountCode}" verified and active for Indiranagar domain.`);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">
              card_membership
            </span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">
              Hunter Ranks &amp; Membership Tiers
            </h1>
          </div>
          <p className="text-xs text-outline mt-1">
            Solo Leveling system progression tiers, biometrics clearance, and subscription pricing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high flex items-center gap-2 text-xs">
            <span className="text-outline">Domain Active Cadre:</span>
            <span className="font-sora font-bold text-secondary">268 Active Members</span>
          </div>
        </div>
      </div>

      {/* Promo Code & Campaign Strip */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-lg">local_activity</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-on-surface">
              Active Domain Campaign: Bengaluru North Titan Rush
            </h4>
            <p className="text-[0.6875rem] text-outline">
              Try promo code <strong className="text-secondary">TITAN20</strong> or <strong className="text-tertiary">IRON500</strong> at front desk checkout.
            </p>
          </div>
        </div>

        <form onSubmit={handleApplyPromo} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Enter promo voucher..."
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            className="bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none uppercase"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs font-bold transition-colors cursor-pointer border border-secondary/30 shrink-0"
          >
            Verify Voucher
          </button>
        </form>
      </div>

      {discountApplied && (
        <div className="p-3 rounded-lg bg-tertiary-container/20 border border-tertiary/40 text-tertiary text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check</span>
          <span>{discountApplied}</span>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {plans.map((plan) => {
          const isTitan = plan.rank === 'RANK S';
          const isElite = plan.rank === 'RANK A';

          return (
            <div
              key={plan.id}
              className={`relative bg-surface-container-low rounded-xl p-5 flex flex-col justify-between border transition-all ${
                isTitan
                  ? 'border-primary-fixed/60 shadow-[0_0_24px_rgba(230,222,255,0.2)]'
                  : isElite
                  ? 'border-primary/60 shadow-[0_0_20px_rgba(202,190,255,0.18)]'
                  : 'border-surface-container-high hover:border-secondary/40'
              }`}
            >
              {/* Corner ticks */}
              <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-secondary/60"></div>
              <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-secondary/60"></div>
              <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-primary/60"></div>
              <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-primary/60"></div>

              <div>
                {/* Header Rank Pill */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[0.6875rem] font-bold tracking-wider ${
                      isTitan
                        ? 'bg-primary-fixed/20 text-primary-fixed border border-primary-fixed/40'
                        : isElite
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {plan.rank}
                  </span>

                  {plan.popular && (
                    <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary-container text-[0.625rem] font-bold uppercase shadow-[0_0_8px_rgba(148,125,255,0.4)]">
                      Guild Favorite
                    </span>
                  )}
                </div>

                <h3 className="font-sora text-base font-semibold text-on-surface leading-tight">
                  {plan.name}
                </h3>
                <p className="text-[0.6875rem] text-outline mt-0.5 mb-4">
                  {plan.durationLabel}
                </p>

                {/* Pricing Display */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-sora text-2xl font-bold text-on-surface">
                      ₹{plan.price.toLocaleString('en-IN')}
                    </span>
                    {plan.originalPrice && (
                      <span className="text-xs text-outline line-through">
                        ₹{plan.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <span className="text-[0.625rem] text-tertiary">Inclusive of 18% GST</span>
                </div>

                {/* Features List */}
                <div className="space-y-2 pt-3 border-t border-surface-container-high mb-6">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-secondary text-sm shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span className="text-[0.6875rem] leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-surface-container-high/80 flex items-center justify-between">
                <div>
                  <span className="text-[0.625rem] text-outline block">Enrolled Cadres</span>
                  <span className="text-xs font-bold text-secondary">
                    {plan.activeCount} Members
                  </span>
                </div>

                <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary hover:text-on-surface text-xs font-semibold border border-primary/30 transition-colors cursor-pointer">
                  Manage Plan
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
