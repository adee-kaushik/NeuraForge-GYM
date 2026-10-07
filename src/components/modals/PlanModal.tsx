import React, { useState } from 'react';
import { savePlan } from '@/actions/plans';
import type { MembershipPlan } from '../../types';

interface PlanModalProps {
  plan?: MembershipPlan; // empty = new plan
  onClose: () => void;
  onSaved: () => void;
}

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1';
const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2.5 text-sm text-on-surface focus:outline-none transition-colors';

export const PlanModal: React.FC<PlanModalProps> = ({ plan, onClose, onSaved }) => {
  const [name, setName] = useState(plan?.name ?? '');
  const [months, setMonths] = useState(String(plan?.durationMonths ?? 1));
  const [price, setPrice] = useState(String(plan?.price ?? ''));
  const [originalPrice, setOriginalPrice] = useState(plan?.originalPrice ? String(plan.originalPrice) : '');
  const [features, setFeatures] = useState((plan?.features ?? []).join('\n'));
  const [popular, setPopular] = useState(plan?.popular ?? false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await savePlan({
      id: plan?.id,
      name,
      durationMonths: Number(months),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      features: features.split('\n'),
      popular,
    });
    setSaving(false);
    if ('error' in res) return setError(res.error);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-low border border-surface-container-high rounded-2xl p-6 space-y-5"
      >
        <h2 className="font-sora text-lg font-bold text-on-surface">{plan ? 'Edit plan' : 'Add plan'}</h2>

        <div>
          <label className={labelClass} htmlFor="plan-name">Plan name</label>
          <input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="plan-months">Months</label>
            <input id="plan-months" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="plan-price">Price (₹, with GST)</label>
            <input id="plan-price" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} required className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="plan-original">Original price (optional)</label>
          <input id="plan-original" type="number" min={1} value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Shown crossed out" className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="plan-features">Features (one per line)</label>
          <textarea id="plan-features" rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} className={inputClass} />
        </div>

        <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
          <input type="checkbox" checked={popular} onChange={(e) => setPopular(e.target.checked)} />
          Mark as "Most Popular"
        </label>

        {error && <p className="text-sm text-error font-semibold">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-bold text-on-surface-variant hover:text-on-surface cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-sm font-bold disabled:opacity-60 cursor-pointer">
            {saving ? 'Saving...' : 'Save plan'}
          </button>
        </div>
      </form>
    </div>
  );
};
