'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ActiveScreen, CheckInRecord, Member, MemberRecord, MembershipPlan, NewMemberInput, NewPaymentInput, TransactionRecord } from '../types';
import { CurrentUser, GymConfig, GymSettingsInput } from '../config/gym';
import { isSameDay } from '../lib/format';
import { toMembers, toTransactions, toCheckInLogs } from '../lib/mappers';
import { computeDashboardStats } from '../lib/stats';
import { addMember, renewMembership, updateMember } from '../actions/members';
import { markPaymentPaid, recordPayment } from '../actions/payments';
import { checkInMember } from '../actions/attendance';
import { updateGymSettings } from '../actions/settings';
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
import { EditMemberModal } from './modals/EditMemberModal';
import { QuickSearchModal } from './QuickSearchModal';

interface AppProps {
  initialGym: GymConfig;
  currentUser: CurrentUser;
  plans: MembershipPlan[];
  initialMembers: MemberRecord[];
  initialTransactions: TransactionRecord[];
  initialCheckIns: CheckInRecord[];
}

export default function App({ initialGym, currentUser, plans, initialMembers, initialTransactions, initialCheckIns }: AppProps) {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');

  // Records come from the database (loaded on the server). Everything the UI shows is derived from them.
  const [now, setNow] = useState(() => new Date());
  const [gym, setGym] = useState<GymConfig>(initialGym);
  const [memberRecords, setMemberRecords] = useState<MemberRecord[]>(initialMembers);
  const [txnRecords, setTxnRecords] = useState<TransactionRecord[]>(initialTransactions);
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>(initialCheckIns);

  // Stops a double click from running the same action twice
  const inFlight = useRef(new Set<string>());

  // Keep "days left", "today" etc. fresh while the dashboard stays open
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const members = useMemo(
    () => toMembers(memberRecords, plans, checkInRecords, txnRecords, now),
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
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
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

  // ── Handlers: each one calls a server action (which checks login and gym), then updates the screen ──
  const handleAddMember = async (input: NewMemberInput): Promise<boolean> => {
    const res = await addMember(input);
    if ('error' in res) {
      showToast(res.error);
      return false;
    }
    setMemberRecords((prev) => [res.member, ...prev]);
    if (res.payment) {
      const payment = res.payment;
      setTxnRecords((prev) => [payment, ...prev]);
    }
    showToast(`${res.member.name} added as a new member.`);
    return true;
  };

  const handleUpdateMember = async (
    memberId: string,
    input: { name: string; phone: string; email: string }
  ): Promise<boolean> => {
    const res = await updateMember(memberId, input);
    if ('error' in res) {
      showToast(res.error);
      return false;
    }
    const updated = res.member;
    setMemberRecords((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    showToast(`${updated.name}'s details updated.`);
    return true;
  };

  const handleCheckIn = async (m: Member) => {
    // Quick checks on screen first; the server checks again (and has the final say)
    if (m.status === 'expired') {
      showToast(`${m.name}'s membership has expired. Renew first.`);
      return;
    }
    if (todayCheckIns.some((c) => c.memberId === m.id)) {
      showToast(`${m.name} is already marked present today.`);
      return;
    }

    const key = `checkin:${m.id}`;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    try {
      const res = await checkInMember(m.id);
      if ('error' in res) {
        showToast(res.error);
        return;
      }
      const record = res.checkIn;
      setCheckInRecords((prev) => [record, ...prev]);
      showToast(`${m.name} marked present.`);
    } finally {
      inFlight.current.delete(key);
    }
  };

  const handleRenewPlan = async (memberId: string) => {
    const key = `renew:${memberId}`;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    try {
      const res = await renewMembership(memberId);
      if ('error' in res) {
        showToast(res.error);
        return;
      }
      setMemberRecords((prev) => prev.map((m) => (m.id === memberId ? { ...m, expiresAt: res.expiresAt } : m)));
      const name = memberRecords.find((m) => m.id === memberId)?.name ?? 'Member';
      showToast(`${name}'s membership renewed.`);
    } finally {
      inFlight.current.delete(key);
    }
  };

  const handleMarkPaid = async (txnId: string) => {
    const key = `paid:${txnId}`;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    try {
      const res = await markPaymentPaid(txnId);
      if ('error' in res) {
        showToast(res.error);
        return;
      }
      setTxnRecords((prev) => prev.map((t) => (t.id === txnId ? { ...t, status: 'PAID' } : t)));
      showToast('Payment marked as paid.');
    } finally {
      inFlight.current.delete(key);
    }
  };

  const handleRecordPayment = async (input: NewPaymentInput) => {
    const res = await recordPayment(input);
    if ('error' in res) {
      showToast(res.error);
      return;
    }
    const payment = res.payment;
    setTxnRecords((prev) => [payment, ...prev]);
    showToast(`Payment of ₹${payment.amount.toLocaleString('en-IN')} recorded for ${payment.memberName}.`);
  };

  const handleSendSingleReminder = (member: Member) => {
    const cleanPhone = member.phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hi ${member.name}, your ${gym.name} membership expires on ${member.expiryDate}. Please renew to keep your membership active.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`, '_blank');
    showToast(`Opening WhatsApp to remind ${member.name}.`);
  };

  const handleSaveSettings = async (input: GymSettingsInput): Promise<boolean> => {
    const res = await updateGymSettings(input);
    if ('error' in res) {
      showToast(res.error);
      return false;
    }
    setGym(res.gym);
    showToast('Settings saved.');
    return true;
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
          user={currentUser}
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

          {activeScreen === 'memberships' && <MembershipsView plans={plans} members={members} canEdit={currentUser.role === 'Gym Owner'} />}

          {activeScreen === 'attendance' && (
            <AttendanceView checkIns={todayCheckIns} members={members} onMarkPresent={handleCheckIn} />
          )}

          {activeScreen === 'payments' && (
            <PaymentsView
              gym={gym}
              plans={plans}
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
        plans={plans}
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
        onEdit={(m) => setEditingMemberId(m.id)}
        onQuickCheckIn={handleCheckIn}
        recentLogs={checkIns}
      />

      {editingMemberId && members.find((m) => m.id === editingMemberId) && (
        <EditMemberModal
          key={editingMemberId}
          member={members.find((m) => m.id === editingMemberId)!}
          onClose={() => setEditingMemberId(null)}
          onSave={handleUpdateMember}
        />
      )}

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
