'use client';

import React, { useState, useEffect } from 'react';
import { MembershipPlan } from '../types';

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  interestedPlan: string;
  preferredTime: string;
  status: 'NEW' | 'FOLLOW_UP' | 'CONVERTED' | 'LOST';
  notes: string;
  createdAt: string;
  followUpDate: string;
}

interface EnquiriesViewProps {
  gymName: string;
  plans: MembershipPlan[];
  onConvertMember?: (data: { name: string; phone: string; email: string; planId?: string }) => void;
}

const DEFAULT_ENQUIRIES: Enquiry[] = [
  {
    id: 'ENQ-101',
    name: 'Rahul Verma',
    phone: '9876543210',
    email: 'rahul.verma@example.com',
    interestedPlan: 'Annual Plan (1 Year)',
    preferredTime: 'Morning (6:00 AM - 8:00 AM)',
    status: 'FOLLOW_UP',
    notes: 'Came for trial today. Interested in annual membership with biometric pass.',
    createdAt: new Date(Date.now() - 86400000 * 2).toLocaleDateString('en-IN'),
    followUpDate: new Date(Date.now() + 86400000).toLocaleDateString('en-IN'),
  },
  {
    id: 'ENQ-102',
    name: 'Pooja Sharma',
    phone: '9812345678',
    email: 'pooja.s@example.com',
    interestedPlan: 'Semi-Annual Plan (6 Months)',
    preferredTime: 'Evening (6:30 PM - 8:30 PM)',
    status: 'NEW',
    notes: 'Inquired via WhatsApp for weight loss and personal training.',
    createdAt: new Date(Date.now() - 86400000).toLocaleDateString('en-IN'),
    followUpDate: new Date().toLocaleDateString('en-IN'),
  },
  {
    id: 'ENQ-103',
    name: 'Amit Patel',
    phone: '9723456789',
    email: 'amit.patel@example.com',
    interestedPlan: '1-Month Trial',
    preferredTime: 'Morning (7:00 AM)',
    status: 'CONVERTED',
    notes: 'Took 1-month trial, paid via UPI.',
    createdAt: new Date(Date.now() - 86400000 * 5).toLocaleDateString('en-IN'),
    followUpDate: new Date(Date.now() - 86400000 * 3).toLocaleDateString('en-IN'),
  },
];

export const EnquiriesView: React.FC<EnquiriesViewProps> = ({
  gymName,
  plans,
  onConvertMember,
}) => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('neuraforge_gym_enquiries');
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_ENQUIRIES;
  });

  const [filter, setFilter] = useState<'ALL' | 'NEW' | 'FOLLOW_UP' | 'CONVERTED' | 'LOST'>('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [interestedPlan, setInterestedPlan] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('neuraforge_gym_enquiries', JSON.stringify(enquiries));
    } catch {
      // storage unavailable
    }
  }, [enquiries]);

  const handleAddEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const newEnq: Enquiry = {
      id: `ENQ-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      interestedPlan: interestedPlan || (plans[0]?.name ?? 'Standard Plan'),
      preferredTime,
      status: 'NEW',
      notes: notes.trim(),
      createdAt: new Date().toLocaleDateString('en-IN'),
      followUpDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString('en-IN'),
    };

    setEnquiries((prev) => [newEnq, ...prev]);
    setIsModalOpen(false);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
  };

  const handleStatusChange = (id: string, status: Enquiry['status']) => {
    setEnquiries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const handleDeleteEnquiry = (id: string) => {
    setEnquiries((prev) => prev.filter((item) => item.id !== id));
  };

  const handleWhatsAppChat = (enq: Enquiry) => {
    const text = `Hi ${enq.name}, greetings from ${gymName}! Thank you for your inquiry about gym membership. Let us know if you would like to schedule a trial workout or have any questions.`;
    window.open(`https://wa.me/91${enq.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredEnquiries = enquiries.filter((e) => {
    const matchesFilter = filter === 'ALL' || e.status === filter;
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search) ||
      e.interestedPlan.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const countNew = enquiries.filter((e) => e.status === 'NEW').length;
  const countFollowUp = enquiries.filter((e) => e.status === 'FOLLOW_UP').length;
  const countConverted = enquiries.filter((e) => e.status === 'CONVERTED').length;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-secondary text-2xl">contact_phone</span>
            <h1 className="font-sora text-xl sm:text-2xl font-bold text-on-surface">
              Enquiries & Lead Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-outline mt-1">
            Track walk-in prospects, trial inquiries, and follow up directly via WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span>Add New Enquiry</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
            Total Enquiries
          </span>
          <span className="font-sora text-2xl font-bold text-on-surface mt-1 block">
            {enquiries.length}
          </span>
          <span className="text-[11px] text-outline mt-0.5 block">Lifetime recorded leads</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-secondary/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
            New Leads
          </span>
          <span className="font-sora text-2xl font-bold text-secondary mt-1 block">
            {countNew}
          </span>
          <span className="text-[11px] text-outline mt-0.5 block">Pending first contact</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-error/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-error block">
            Follow-Up Due
          </span>
          <span className="font-sora text-2xl font-bold text-error mt-1 block">
            {countFollowUp}
          </span>
          <span className="text-[11px] text-outline mt-0.5 block">Ready for WhatsApp reminder</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-tertiary/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">
            Converted to Members
          </span>
          <span className="font-sora text-2xl font-bold text-tertiary mt-1 block">
            {countConverted}
          </span>
          <span className="text-[11px] text-outline mt-0.5 block">
            {enquiries.length > 0 ? Math.round((countConverted / enquiries.length) * 100) : 0}% conversion rate
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-low p-3 rounded-xl border border-surface-container-high">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name, phone or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface focus:outline-none"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'NEW', 'FOLLOW_UP', 'CONVERTED', 'LOST'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filter === tab
                  ? 'bg-secondary text-[#001f28] shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {tab === 'ALL'
                ? `All (${enquiries.length})`
                : tab === 'NEW'
                ? `New (${countNew})`
                : tab === 'FOLLOW_UP'
                ? `Follow Up (${countFollowUp})`
                : tab === 'CONVERTED'
                ? `Converted (${countConverted})`
                : 'Lost'}
            </button>
          ))}
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="bg-surface-container-low rounded-xl border border-surface-container-high overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container border-b border-surface-container-high text-outline uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Prospect</th>
                <th className="py-3 px-3">Interested Plan</th>
                <th className="py-3 px-3">Slot</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/60">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-outline text-xs">
                    No enquiries found. Click &quot;Add New Enquiry&quot; to log your first lead.
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-on-surface">{enq.name}</div>
                      <div className="text-[11px] text-outline flex items-center gap-2 mt-0.5">
                        <span>📞 {enq.phone}</span>
                        {enq.email && <span>· ✉️ {enq.email}</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-semibold text-[11px]">
                        {enq.interestedPlan}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-outline text-[11px]">
                      {enq.preferredTime}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={enq.status}
                        onChange={(e) => handleStatusChange(enq.id, e.target.value as Enquiry['status'])}
                        className={`text-[11px] font-bold rounded-lg px-2 py-1 border bg-surface-container-lowest focus:outline-none cursor-pointer ${
                          enq.status === 'NEW'
                            ? 'text-secondary border-secondary/40'
                            : enq.status === 'FOLLOW_UP'
                            ? 'text-error border-error/40'
                            : enq.status === 'CONVERTED'
                            ? 'text-tertiary border-tertiary/40'
                            : 'text-outline border-surface-container-high'
                        }`}
                      >
                        <option value="NEW">New</option>
                        <option value="FOLLOW_UP">Follow Up</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 max-w-xs text-outline text-[11px] truncate" title={enq.notes}>
                      {enq.notes || '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleWhatsAppChat(enq)}
                          className="px-2.5 py-1 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-[#001f11] font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer border border-[#25D366]/30"
                          title="Open WhatsApp chat"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                          <span>WhatsApp</span>
                        </button>

                        {onConvertMember && enq.status !== 'CONVERTED' && (
                          <button
                            type="button"
                            onClick={() => {
                              handleStatusChange(enq.id, 'CONVERTED');
                              onConvertMember({
                                name: enq.name,
                                phone: enq.phone,
                                email: enq.email,
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary text-primary hover:text-on-primary font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer border border-primary/30"
                            title="Register as active gym member"
                          >
                            <span className="material-symbols-outlined text-sm">person_add</span>
                            <span>Convert</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteEnquiry(enq.id)}
                          className="p-1 rounded text-outline hover:text-error transition-colors cursor-pointer"
                          title="Delete enquiry"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Enquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">contact_phone</span>
                <h3 className="font-sora font-bold text-sm text-on-surface">New Gym Prospect Enquiry</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleAddEnquiry} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container border border-surface-container-high rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  WhatsApp / Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-surface-container border border-surface-container-high rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="prospect@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container border border-surface-container-high rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    Interested Plan
                  </label>
                  <select
                    value={interestedPlan}
                    onChange={(e) => setInterestedPlan(e.target.value)}
                    className="w-full bg-surface-container border border-surface-container-high rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value="">Select Plan...</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    <option value="1-Month Trial">1-Month Trial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    Workout Time
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full bg-surface-container border border-surface-container-high rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  Notes / Goal
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Weight loss, wants evening trial, budget ₹5k"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-container border border-surface-container-high rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-outline hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90"
                >
                  Save Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
