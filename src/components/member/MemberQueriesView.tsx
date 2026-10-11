'use client';

import React, { useState, useTransition } from 'react';
import { submitMemberQuery } from '@/app/member/actions';

export interface MemberQueryItem {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  reply: string | null;
  createdAt: string;
}

interface MemberQueriesViewProps {
  gymName: string;
  initialQueries: MemberQueryItem[];
}

const CATEGORIES = [
  { id: 'WORKOUT_PLAN', label: 'Workout Plan', icon: 'fitness_center', desc: 'Diet or exercise routine changes' },
  { id: 'MACHINE_MALFUNCTION', label: 'Machine Malfunctioning', icon: 'build', desc: 'Broken cable, loose pin, treadmill error' },
  { id: 'TIMINGS', label: 'Gym Timings', icon: 'schedule', desc: 'Opening / closing hour inquiries or holiday schedule' },
  { id: 'BILLING', label: 'Billing & Payment', icon: 'receipt_long', desc: 'UPI receipt, invoice or fee question' },
  { id: 'OTHER', label: 'Other Feedback', icon: 'chat', desc: 'General question, music request, or trainer feedback' },
];

export const MemberQueriesView: React.FC<MemberQueriesViewProps> = ({ gymName, initialQueries }) => {
  const [queries, setQueries] = useState<MemberQueryItem[]>(initialQueries);
  const [category, setCategory] = useState<string>('WORKOUT_PLAN');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState<boolean>(initialQueries.length === 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!subject.trim() || !message.trim()) {
      setFeedback({ text: 'Please fill in both the subject and query details.', isError: true });
      return;
    }

    startTransition(async () => {
      const res = await submitMemberQuery(category, subject, message);
      if (!res.ok) {
        setFeedback({ text: res.error || 'Failed to submit query.', isError: true });
      } else {
        const newQuery: MemberQueryItem = {
          id: `temp-${Date.now()}`,
          category,
          subject,
          message,
          status: 'PENDING',
          reply: null,
          createdAt: 'Just now',
        };
        setQueries([newQuery, ...queries]);
        setSubject('');
        setMessage('');
        setShowForm(false);
        setFeedback({ text: '✅ Query submitted successfully! Your gym team has been notified.' });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return { label: 'Resolved', style: 'bg-tertiary/15 text-tertiary border-tertiary/30' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', style: 'bg-secondary/15 text-secondary border-secondary/30' };
      default:
        return { label: 'Under Review', style: 'bg-[#ffc107]/15 text-[#ffc107] border-[#ffc107]/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Query trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sora text-lg font-bold text-on-surface">Help &amp; Queries</h2>
          <p className="text-xs text-outline">Report equipment issues, ask about workout plans or timings</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setFeedback(null);
          }}
          className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">{showForm ? 'close' : 'add'}</span>
          <span>{showForm ? 'Cancel' : 'Raise New Query'}</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.isError
              ? 'bg-error/15 border border-error/30 text-error'
              : 'bg-tertiary/15 border border-tertiary/30 text-tertiary'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {feedback.isError ? 'error' : 'check_circle'}
          </span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Query Submission Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-secondary/40 bg-surface-container-low p-5 sm:p-6 space-y-4 shadow-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-surface-container-high">
            <span className="material-symbols-outlined text-secondary text-xl">contact_support</span>
            <h3 className="font-sora text-sm font-bold text-on-surface">New Request to {gymName}</h3>
          </div>

          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-outline">
              Select Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-surface-container-lowest border-secondary text-secondary shadow-xs'
                        : 'bg-surface-container border-surface-container-high text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">{cat.icon}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs leading-none">{cat.label}</p>
                      <p className="text-[10px] text-outline mt-1 truncate">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-outline">
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Treadmill #3 incline button not responding"
              className="w-full bg-surface-container-lowest border border-surface-container-highest focus:border-secondary rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none"
            />
          </div>

          {/* Message / Details */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-outline">
              Details / Description
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or request clearly so gym staff can assist you promptly..."
              className="w-full bg-surface-container-lowest border border-surface-container-highest focus:border-secondary rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-base">send</span>
            )}
            <span>{isPending ? 'Sending to Management...' : 'Send Query to Management'}</span>
          </button>
        </form>
      )}

      {/* Submitted Queries History */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-outline">
          Your Submitted Queries ({queries.length})
        </h3>

        {queries.length > 0 ? (
          <div className="space-y-3">
            {queries.map((q) => {
              const status = getStatusBadge(q.status);
              const catObj = CATEGORIES.find((c) => c.id === q.category) || CATEGORIES[4];

              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-surface-container-high bg-surface-container-low p-4 space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-surface-container text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-base">{catObj.icon}</span>
                      </span>
                      <div>
                        <h4 className="font-sora font-bold text-on-surface">{q.subject}</h4>
                        <span className="text-[10px] text-outline font-medium">
                          {catObj.label} · {q.createdAt}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${status.style}`}>
                      {status.label}
                    </span>
                  </div>

                  <p className="text-on-surface-variant leading-relaxed text-[11px] pl-1">{q.message}</p>

                  {/* Owner / Staff Reply */}
                  {q.reply && (
                    <div className="mt-2 p-3 rounded-xl bg-surface-container-lowest border border-secondary/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-secondary font-bold text-[10px] uppercase">
                        <span className="material-symbols-outlined text-xs">reply</span>
                        <span>Response from {gymName}</span>
                      </div>
                      <p className="text-on-surface text-[11px] leading-relaxed">{q.reply}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-container-highest p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-outline text-3xl">chat_bubble_outline</span>
            <p className="text-xs font-bold text-on-surface">No queries submitted yet</p>
            <p className="text-[11px] text-outline max-w-xs mx-auto">
              Need assistance with your workout schedule, machine maintenance, or gym timings? Tap "Raise New Query" above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
