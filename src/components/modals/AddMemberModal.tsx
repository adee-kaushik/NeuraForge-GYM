import React, { useState } from 'react';
import { Member, HunterRank, Transaction } from '../../types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (newMember: Member, txn?: Transaction) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onAddMember,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [rankTier, setRankTier] = useState<HunterRank>('RANK A');
  const [paymentMode, setPaymentMode] = useState<
    'Google Pay UPI' | 'PhonePe UPI' | 'Paytm UPI' | 'Cash Settlement' | 'Credit Card'
  >('Google Pay UPI');
  const [generateInvoice, setGenerateInvoice] = useState(true);

  if (!isOpen) return null;

  const planOptions: Record<
    HunterRank,
    { name: string; duration: 'Yearly' | 'Half-Yr' | 'Quarterly' | 'Monthly' | 'VIP'; price: number }
  > = {
    'RANK S': { name: 'Titan VIP Lifetime', duration: 'VIP', price: 32000 },
    'RANK A': { name: 'Yearly Elite', duration: 'Yearly', price: 18500 },
    'RANK B': { name: 'Half-Yearly Surge', duration: 'Half-Yr', price: 11000 },
    'RANK C': { name: 'Quarterly Warrior', duration: 'Quarterly', price: 6200 },
    'RANK E': { name: 'Monthly Starter', duration: 'Monthly', price: 2500 },
  };

  const selectedPlan = planOptions[rankTier];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = `MEM-${Math.floor(100 + Math.random() * 900)}`;
    const initials = name
      .trim()
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const tagId = `IP-TAG-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMember: Member = {
      id,
      name,
      phone,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      rank: rankTier,
      planName: selectedPlan.name,
      planDuration: selectedPlan.duration,
      expiryDate:
        selectedPlan.duration === 'Yearly' || selectedPlan.duration === 'VIP'
          ? '24 Oct 2025'
          : selectedPlan.duration === 'Half-Yr'
          ? '24 Apr 2025'
          : selectedPlan.duration === 'Quarterly'
          ? '24 Jan 2025'
          : '24 Nov 2024',
      daysLeft:
        selectedPlan.duration === 'Yearly' || selectedPlan.duration === 'VIP'
          ? 365
          : selectedPlan.duration === 'Half-Yr'
          ? 180
          : selectedPlan.duration === 'Quarterly'
          ? 90
          : 30,
      status: 'active',
      avatarInitials: initials || 'IP',
      rfidTag: tagId,
      joinDate: '24 Oct 2024',
      attendanceCountThisMonth: 0,
    };

    let newTxn: Transaction | undefined;
    if (generateInvoice) {
      newTxn = {
        id: `#TXN-${Math.floor(9090 + Math.random() * 90)}`,
        memberId: id,
        memberName: name,
        memberEmail: newMember.email,
        planCategory: selectedPlan.name,
        amount: selectedPlan.price,
        paymentMode,
        timestamp: 'Today, Just Now',
        status: 'PAID',
        invoiceNo: `INV-2024-${Math.floor(9100 + Math.random() * 100)}`,
        gstAmount: Math.round(selectedPlan.price * 0.18),
      };
    }

    onAddMember(newMember, newTxn);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-surface-container-low border border-primary-container/40 rounded-xl shadow-[0_0_40px_rgba(148,125,255,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Manhwa HUD top corners */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-primary"></div>
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-secondary"></div>
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-secondary"></div>

        {/* Modal Header */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center border border-primary-container/40 shadow-[0_0_12px_rgba(148,125,255,0.3)]">
              <span className="material-symbols-outlined text-lg">person_add</span>
            </div>
            <div>
              <h3 className="font-sora text-base font-semibold text-on-surface">
                Enlist New Hunter Cadre
              </h3>
              <p className="text-xs text-outline">
                Issue Biometric RFID &amp; Authorize Turnstile Clearance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Vikram Malhotra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2 text-xs text-on-surface focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1">
                Phone Number (WhatsApp) *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98..."
                className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2 text-xs text-on-surface focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3.5 py-2 text-xs text-on-surface focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Hunter Rank Tier Selection */}
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1.5">
              Select Hunter Tier / Subscription
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['RANK S', 'RANK A', 'RANK B', 'RANK C', 'RANK E'] as HunterRank[]).map((rank) => {
                const plan = planOptions[rank];
                const isSelected = rankTier === rank;
                return (
                  <button
                    key={rank}
                    type="button"
                    onClick={() => setRankTier(rank)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-surface-container-high border-primary text-primary shadow-[0_0_12px_rgba(202,190,255,0.25)]'
                        : 'bg-surface-container-lowest border-surface-container-high text-on-surface-variant hover:border-outline-variant'
                    }`}
                  >
                    <div className="text-[0.6875rem] font-bold">{rank}</div>
                    <div className="text-xs font-semibold mt-0.5 text-on-surface">
                      ₹{plan.price.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[0.625rem] text-outline">{plan.duration}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1">
                Settlement Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) =>
                  setPaymentMode(
                    e.target.value as 'Google Pay UPI' | 'PhonePe UPI' | 'Cash Settlement' | 'Credit Card'
                  )
                }
                className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none cursor-pointer"
              >
                <option value="Google Pay UPI">Google Pay UPI</option>
                <option value="PhonePe UPI">PhonePe UPI</option>
                <option value="Paytm UPI">Paytm UPI</option>
                <option value="Cash Settlement">Cash Desk Settlement</option>
                <option value="Credit Card">HDFC Card Terminal</option>
              </select>
            </div>

            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-outline mb-1">
                Biometric Token
              </label>
              <div className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 text-xs text-secondary font-mono flex items-center justify-between">
                <span>IP-TAG-{Math.floor(1000 + Math.random() * 9000)}</span>
                <span className="text-[0.625rem] text-tertiary uppercase font-bold">Auto-assigned</span>
              </div>
            </div>
          </div>

          {/* Auto Generate Receipt Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="genInvoice"
              checked={generateInvoice}
              onChange={(e) => setGenerateInvoice(e.target.checked)}
              className="accent-[#947dff] rounded w-4 h-4 cursor-pointer"
            />
            <label htmlFor="genInvoice" className="text-xs text-on-surface-variant cursor-pointer">
              Reconcile ₹{selectedPlan.price.toLocaleString('en-IN')} in Treasury &amp; generate GST Tax Invoice
            </label>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-surface-container-high flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold transition-all shadow-[0_0_16px_rgba(148,125,255,0.35)] cursor-pointer"
            >
              Confirm Enlistment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
