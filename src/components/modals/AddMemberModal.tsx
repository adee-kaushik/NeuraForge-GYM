import React, { useState } from 'react';
import { MembershipPlan, NewMemberInput, PaymentMode } from '../../types';

interface AddMemberModalProps {
  isOpen: boolean;
  plans: MembershipPlan[];
  onClose: () => void;
  onAddMember: (input: NewMemberInput) => void;
}

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1';
const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2 text-xs text-on-surface focus:outline-none transition-colors';

const DEFAULT_PHONE = '+91 ';

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, plans, onClose, onAddMember }) => {
  const defaultPlanId = (plans.find((p) => p.popular) ?? plans[0])?.id ?? '';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [email, setEmail] = useState('');
  const [planId, setPlanId] = useState(defaultPlanId);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [recordPayment, setRecordPayment] = useState(true);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const plan = plans.find((p) => p.id === planId) ?? plans[0];

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Enter a valid phone number (at least 10 digits).');
      return;
    }

    onAddMember({ name, phone, email, planId: plan.id, recordPayment, paymentMode });

    // Reset the form for the next member
    setName('');
    setPhone(DEFAULT_PHONE);
    setEmail('');
    setPlanId(defaultPlanId);
    setPaymentMode('UPI');
    setRecordPayment(true);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-surface-container-low border border-primary-container/40 rounded-xl shadow-[0_0_40px_rgba(148,125,255,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Corner ticks */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-primary"></div>
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-secondary"></div>
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-secondary"></div>

        {/* Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center border border-primary-container/40">
              <span className="material-symbols-outlined text-lg">person_add</span>
            </div>
            <div>
              <h3 className="font-sora text-base font-semibold text-on-surface">Add New Member</h3>
              <p className="text-xs text-outline">Enter the member&apos;s details and choose a plan</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Vikram Malhotra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone Number (WhatsApp) *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={inputClass}
              />
            </div>
          </div>

          {/* Plan selection */}
          <div>
            <label className={`${labelClass} mb-1.5`}>Choose a Plan</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    planId === p.id
                      ? 'bg-surface-container-high border-primary text-primary'
                      : 'bg-surface-container-lowest border-surface-container-high text-on-surface-variant hover:border-outline-variant'
                  }`}
                >
                  <div className="text-xs font-bold">{p.name}</div>
                  <div className="text-xs font-semibold mt-0.5 text-on-surface">₹{p.price.toLocaleString('en-IN')}</div>
                  <div className="text-xs text-outline">{p.durationLabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div>
            <label className={labelClass}>Payment Method</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recordPayment"
              checked={recordPayment}
              onChange={(e) => setRecordPayment(e.target.checked)}
              className="accent-[#947dff] rounded w-4 h-4 cursor-pointer"
            />
            <label htmlFor="recordPayment" className="text-xs text-on-surface-variant cursor-pointer">
              Record payment of ₹{plan.price.toLocaleString('en-IN')} and create invoice (GST included)
            </label>
          </div>

          {error && <p className="text-xs text-error font-semibold">{error}</p>}

          {/* Footer */}
          <div className="pt-4 border-t border-surface-container-high flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold transition-all shadow-[0_0_16px_rgba(148,125,255,0.35)] cursor-pointer"
            >
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
