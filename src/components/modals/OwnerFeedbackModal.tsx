'use client';

import React, { useState, useEffect } from 'react';
import { submitOwnerFeedback, getOwnerFeedbackHistory } from '@/actions/feedback';

interface OwnerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  gymName: string;
}

interface FeedbackItem {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
}

export const OwnerFeedbackModal: React.FC<OwnerFeedbackModalProps> = ({
  isOpen,
  onClose,
  gymName,
}) => {
  const [tab, setTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [category, setCategory] = useState<'FEATURE_REQUEST' | 'BUG_REPORT' | 'BILLING_SUBSCRIPTION' | 'HARDWARE_BIOMETRIC' | 'OTHER'>('FEATURE_REQUEST');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && tab === 'HISTORY') {
      loadHistory();
    }
  }, [isOpen, tab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getOwnerFeedbackHistory();
      setHistory(res as FeedbackItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    const res = await submitOwnerFeedback({
      category,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSubmitting(false);

    if (res.ok) {
      setFeedbackSuccess(true);
      setSubject('');
      setMessage('');
      setTimeout(() => {
        setFeedbackSuccess(false);
        setTab('HISTORY');
        loadHistory();
      }, 1500);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'FEATURE_REQUEST': return 'Feature Request';
      case 'BUG_REPORT': return 'Bug Report';
      case 'BILLING_SUBSCRIPTION': return 'SaaS Subscription & Billing';
      case 'HARDWARE_BIOMETRIC': return 'Biometric Machine Setup';
      default: return 'General Query';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">support_agent</span>
            </div>
            <div>
              <h2 className="font-sora text-lg font-bold text-on-surface">
                Support & Feedback to NeuraFitness
              </h2>
              <p className="text-xs text-outline">
                Direct line to SaaS Co-Founders & Technical Team ({gymName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-surface-container-high px-5 pt-3 gap-4 bg-surface-container-lowest text-xs font-semibold">
          <button
            onClick={() => setTab('NEW')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              tab === 'NEW'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>Raise New Query / Idea</span>
          </button>
          <button
            onClick={() => {
              setTab('HISTORY');
              loadHistory();
            }}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              tab === 'HISTORY'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">forum</span>
            <span>Previous Queries & Replies</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {tab === 'NEW' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {feedbackSuccess && (
                <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary text-xs font-semibold flex items-center gap-2 animate-in zoom-in-95">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>Query submitted! NeuraFitness founders have been notified.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'FEATURE_REQUEST', label: 'Feature Request', icon: 'lightbulb' },
                    { id: 'BUG_REPORT', label: 'Bug / Issue', icon: 'bug_report' },
                    { id: 'BILLING_SUBSCRIPTION', label: 'SaaS Plan & Billing', icon: 'payments' },
                    { id: 'HARDWARE_BIOMETRIC', label: 'Biometric / Hardware', icon: 'fingerprint' },
                    { id: 'OTHER', label: 'Other Query', icon: 'help' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id as any)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs transition-all ${
                        category === c.id
                          ? 'border-secondary bg-secondary/10 text-on-surface font-bold'
                          : 'border-surface-container-high bg-surface-container-low text-on-surface-variant hover:border-outline'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base text-secondary">{c.icon}</span>
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1.5">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Need WhatsApp invoice automation / Question about 1-year plan"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-xs sm:text-sm focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1.5">
                  Detailed Query or Feedback
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your requirement, issue, or question in detail. We review all feedback daily!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-xs sm:text-sm focus:outline-none focus:border-secondary resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">send</span>
                      <span>Submit Query to Co-Founders</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="py-12 text-center text-outline text-xs flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-2xl animate-spin text-secondary">refresh</span>
                  <span>Loading query history...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-outline text-xs">
                  No previous queries or tickets found. Use the &apos;Raise New Query&apos; tab to contact founders.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-surface-container-high bg-surface-container-low space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-on-surface">
                          {getCategoryLabel(item.category)}
                        </span>
                        <span className="text-[10px] text-outline">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'RESOLVED'
                            ? 'bg-secondary/15 text-secondary border border-secondary/30'
                            : 'bg-error/15 text-error border border-error/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-on-surface">{item.subject}</h4>
                    <p className="text-xs text-on-surface-variant whitespace-pre-wrap">{item.message}</p>

                    {item.adminReply && (
                      <div className="mt-2.5 p-3 rounded-lg bg-surface-container border-l-2 border-secondary space-y-1">
                        <div className="flex items-center gap-1.5 text-secondary text-[11px] font-bold">
                          <span className="material-symbols-outlined text-sm">verified</span>
                          <span>Response from NeuraFitness Co-Founders:</span>
                        </div>
                        <p className="text-xs text-on-surface whitespace-pre-wrap font-medium">
                          {item.adminReply}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
