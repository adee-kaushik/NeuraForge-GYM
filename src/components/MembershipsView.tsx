import React from 'react';
import { Member, MembershipPlan } from '../types';
import { inr } from '../lib/format';

interface MembershipsViewProps {
  plans: MembershipPlan[];
  members: Member[];
}

export const MembershipsView: React.FC<MembershipsViewProps> = ({ plans, members }) => {
  const activeMembers = members.filter((m) => m.status !== 'expired');
  const activeOn = (planId: string) => activeMembers.filter((m) => m.planId === planId).length;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">card_membership</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">Membership Plans</h1>
          </div>
          <p className="text-xs text-outline mt-1">Your plans, prices and how many members are on each</p>
        </div>

        <div className="px-3.5 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high flex items-center gap-2 text-xs">
          <span className="text-outline">Active members:</span>
          <span className="font-sora font-bold text-secondary">{activeMembers.length}</span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-surface-container-low rounded-xl p-5 flex flex-col justify-between border transition-all ${
              plan.popular
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
              {plan.popular && (
                <span className="inline-block mb-3 px-2 py-0.5 rounded bg-primary-container text-on-primary-container text-xs font-bold uppercase">
                  Most Popular
                </span>
              )}

              <h3 className="font-sora text-base font-semibold text-on-surface leading-tight">{plan.name}</h3>
              <p className="text-xs text-outline mt-0.5 mb-4">{plan.durationLabel}</p>

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
                <span className="text-xs text-tertiary">Includes 18% GST</span>
              </div>

              <div className="space-y-2 pt-3 border-t border-surface-container-high mb-6">
                {plan.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-sm shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <span className="text-xs leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-surface-container-high/80">
              <span className="text-xs text-outline block">Members on this plan</span>
              <span className="text-xs font-bold text-secondary">{activeOn(plan.id)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
