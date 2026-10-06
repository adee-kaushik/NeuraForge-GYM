'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ActiveScreen, CheckInRecord, Member, MemberRecord, NewMemberInput, NewPaymentInput, TransactionRecord } from '../types';
import {
  MEMBERSHIP_PLANS,
  createInitialMembers,
  createInitialTransactions,
  createInitialCheckIns,
} from '../data/mockData';
import { GYM, GymConfig } from '../config/gym';
import { addMonths, formatDate, gstIncluded, isSameDay } from '../lib/format';
import { nextId, invoiceFor } from '../lib/ids';
import { toMembers, toTransactions, toCheckInLogs } from '../lib/mappers';
import { computeDashboardStats } from '../lib/stats';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardView } from './DashboardView';
import { MembersView } from './MembersView';
import { MembershipsView } from './MembershipsView';
import { AttendanceView } from './AttendanceView';
import { PaymentsView } from './PaymentsView';
import { SettingsView } from './SettingsView';
import { AddMemberModal } from './modals/AddMemberModal';
import { BulkWhatsAppModal } from './modals/BulkWhatsAppModal';
import { MemberDetailModal } from './modals/MemberDetailModal';
import { QuickSearchModal } from './QuickSearchModal';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');

  // "Database" for the frontend-only phase: raw records with ISO dates.
  // Everything the UI shows is derived from these below.
  const [now, setNow] = useState(() => new Date());
  const [gym, setGym] = useState<GymConfig>(GYM);
  const [memberRecords, setMemberRecords] = useState<MemberRecord[]>(() => createInitialMembers(new Date()));
  const [txnRecords, setTxnRecords] = useState<TransactionRecord[]>(() => createInitialTransactions(new Date()));
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>(() => createInitialCheckIns(new Date()));

  // Keep "days left", "today" etc. fresh while the dashboard stays open
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const members = useMemo(
    () => toMembers(memberRecords, MEMBERSHIP_PLANS, checkInRecords, txnRecords, now),
    [memberRecords, checkInRecords, txnRecords, now]
  );
  const transactions = useMemo(() => toTransactions(txnRecords, now), [txnRecords, now]);
  const checkIns = useMemo(() => toCheckInLogs(checkInRecords, members), [checkInRecords, members]);
  const todayCheckIns = useMemo(() => checkIns.filter((c) => isSameDay(c.checkedInAt, now)), [checkIns, now]);
  const stats = useMemo(
    () => computeDashboardStats(members, transactions, checkIns, gym.monthlyRevenueGoal, now),
    [members, transactions, checkIns, gym.monthlyRevenueGoal, now]
  );

  // Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isBulkWhatsAppOpen, setIsBulkWhatsAppOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // The member modal holds a snapshot; keep it in sync with the latest derived data
  const selectedMemberLive = selectedMember ? members.find((m) => m.id === selectedMember.id) ?? null : null;

  // ── Handlers (each one becomes an API call / server action later) ──
  const buildTransaction = (
    member: { id: string; name: string; email: string },
    planCategory: string,
    amount: number,
    paymentMode: NewPaymentInput['paymentMode'],
    status: TransactionRecord['status'],
    existing: TransactionRecord[]
  ): TransactionRecord => {
    const id = nextId(existing.map((t) => t.id), '#TXN-', 9001);
    return {
      id,
      memberId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      planCategory,
      amount,
      paymentMode,
      status,
      invoiceNo: invoiceFor(id, new Date()),
      gstAmount: gstIncluded(amount, gym.gstRatePercent),
      createdAt: new Date().toISOString(),
    };
  };

  const handleAddMember = (input: NewMemberInput) => {
    const plan = MEMBERSHIP_PLANS.find((p) => p.id === input.planId);
    if (!plan) return;

    const joined = new Date();
    const record: MemberRecord = {
      id: nextId(memberRecords.map((m) => m.id), 'MEM-', 1, 3),
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      planId: plan.id,
      joinedAt: joined.toISOString(),
      expiresAt: addMonths(joined, plan.durationMonths).toISOString(),
    };

    setMemberRecords((prev) => [record, ...prev]);
    if (input.recordPayment) {
      setTxnRecords((prev) => [buildTransaction(record, plan.name, plan.price, input.paymentMode, 'PAID', prev), ...prev]);
    }
    showToast(`${record.name} added as a new member.`);
  };

  const handleCheckIn = (m: Member) => {
    if (m.status === 'expired') {
      showToast(`${m.name}'s membership has expired. Renew first.`);
      return;
    }
    if (todayCheckIns.some((c) => c.memberId === m.id)) {
      showToast(`${m.name} is already marked present today.`);
      return;
    }
    const record: CheckInRecord = {
      id: nextId(checkInRecords.map((c) => c.id), 'CHK-', 1, 3),
      memberId: m.id,
      checkedInAt: new Date().toISOString(),
    };
    setCheckInRecords((prev) => [record, ...prev]);
    showToast(`${m.name} marked present.`);
  };

  const handleRenewPlan = (memberId: string) => {
    const rec = memberRecords.find((m) => m.id === memberId);
    const plan = rec && MEMBERSHIP_PLANS.find((p) => p.id === rec.planId);
    if (!rec || !plan) return;

    // Renew from the later of today / current expiry, so early renewals don't lose days
    const base = new Date(Math.max(Date.now(), new Date(rec.expiresAt).getTime()));
    const newExpiry = addMonths(base, plan.durationMonths);
    setMemberRecords((prev) => prev.map((m) => (m.id === memberId ? { ...m, expiresAt: newExpiry.toISOString() } : m)));
    showToast(`${rec.name} renewed till ${formatDate(newExpiry.toISOString())}.`);
  };

  const handleMarkPaid = (txnId: string) => {
    setTxnRecords((prev) => prev.map((t) => (t.id === txnId ? { ...t, status: 'PAID' } : t)));
    showToast(`Payment ${txnId} marked as paid.`);
  };

  const handleRecordPayment = (input: NewPaymentInput) => {
    const member = members.find((m) => m.id === input.memberId);
    if (!member) return;
    setTxnRecords((prev) => [
      buildTransaction(member, member.planName, input.amount, input.paymentMode, 'PAID', prev),
      ...prev,
    ]);
    showToast(`Payment of ₹${input.amount.toLocaleString('en-IN')} recorded for ${member.name}.`);
  };

  const handleSendSingleReminder = (member: Member) => {
    const cleanPhone = member.phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hi ${member.name}, your ${gym.name} membership expires on ${member.expiryDate}. Please renew to keep your membership active.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`, '_blank');
    showToast(`Opening WhatsApp to remind ${member.name}.`);
  };

  const handleSaveSettings = (next: GymConfig) => {
    setGym(next);
    showToast('Settings saved.');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-secondary/30 selection:text-on-surface flex">
      {/* Toast message */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-surface-container-low border border-secondary rounded-xl px-4 py-3 shadow-[0_0_24px_rgba(123,208,255,0.35)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-secondary text-xl">check_circle</span>
          <span className="text-xs font-semibold text-on-surface">{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar
        gym={gym}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        expiringCount={stats.expiringThisWeek}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Fixed Header */}
        <Header
          stats={stats}
          onOpenAddMember={() => setIsAddMemberOpen(true)}
          onOpenSearch={() => setIsQuickSearchOpen(true)}
          onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onOpenBulkWhatsApp={() => setIsBulkWhatsAppOpen(true)}
        />

        {/* View Routing */}
        <main className="w-full pt-16 min-h-screen">
          {activeScreen === 'dashboard' && (
            <DashboardView
              stats={stats}
              members={members}
              transactions={transactions}
              checkIns={checkIns}
              onOpenBulkWhatsApp={() => setIsBulkWhatsAppOpen(true)}
              onViewAllExpiring={() => setActiveScreen('members')}
              onSelectMember={(m) => setSelectedMember(m)}
              onSendSingleReminder={handleSendSingleReminder}
            />
          )}

          {activeScreen === 'members' && (
            <MembersView
              members={members}
              onSelectMember={(m) => setSelectedMember(m)}
              onOpenAddMember={() => setIsAddMemberOpen(true)}
              onOpenBulkWhatsApp={() => setIsBulkWhatsAppOpen(true)}
              onSendSingleReminder={handleSendSingleReminder}
            />
          )}

          {activeScreen === 'memberships' && <MembershipsView plans={MEMBERSHIP_PLANS} members={members} />}

          {activeScreen === 'attendance' && (
            <AttendanceView checkIns={todayCheckIns} members={members} onMarkPresent={handleCheckIn} />
          )}

          {activeScreen === 'payments' && (
            <PaymentsView
              gym={gym}
              plans={MEMBERSHIP_PLANS}
              members={members}
              transactions={transactions}
              onMarkPaid={handleMarkPaid}
              onNewPayment={handleRecordPayment}
            />
          )}

          {activeScreen === 'settings' && <SettingsView gym={gym} onSave={handleSaveSettings} />}
        </main>
      </div>

      {/* Modals & Drawers */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        plans={MEMBERSHIP_PLANS}
        onClose={() => setIsAddMemberOpen(false)}
        onAddMember={handleAddMember}
      />

      <BulkWhatsAppModal
        isOpen={isBulkWhatsAppOpen}
        gymName={gym.name}
        onClose={() => setIsBulkWhatsAppOpen(false)}
        members={members}
      />

      <MemberDetailModal
        member={selectedMemberLive}
        gymName={gym.name}
        onClose={() => setSelectedMember(null)}
        onRenewPlan={handleRenewPlan}
        onQuickCheckIn={handleCheckIn}
        recentLogs={checkIns}
      />

      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        members={members}
        onSelectMember={(m) => setSelectedMember(m)}
        onNavigateScreen={(screen) => setActiveScreen(screen)}
      />
    </div>
  );
}
