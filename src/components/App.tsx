'use client';

import React, { useState, useEffect } from 'react';
import { ActiveScreen, Member, Transaction, CheckInLog } from '../types';
import { INITIAL_MEMBERS, INITIAL_TRANSACTIONS, INITIAL_CHECKINS } from '../data/mockData';
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
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [checkIns, setCheckIns] = useState<CheckInLog[]>(INITIAL_CHECKINS);

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

  // Handlers
  const handleAddMember = (newMember: Member, newTxn?: Transaction) => {
    setMembers((prev) => [newMember, ...prev]);
    if (newTxn) {
      setTransactions((prev) => [newTxn, ...prev]);
    }
    showToast(`${newMember.name} added as a new member.`);
  };

  const handleCheckIn = (m: Member) => {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const log: CheckInLog = {
      id: `CHK-${Date.now().toString().slice(-4)}`,
      memberId: m.id,
      memberName: m.name,
      planDuration: m.planDuration,
      time,
    };
    setCheckIns((prev) => [log, ...prev]);
    showToast(`${m.name} marked present.`);
  };

  const handleRenewPlan = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              expiryDate: '24 Oct 2025',
              daysLeft: 365,
              status: 'active',
              attendanceCountThisMonth: m.attendanceCountThisMonth + 1,
            }
          : m
      )
    );
    showToast('Membership renewed for 365 days!');
  };

  const handleMarkPaid = (txnId: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === txnId ? { ...t, status: 'PAID' } : t))
    );
    showToast(`Payment ${txnId} marked as paid.`);
  };

  const handleSendSingleReminder = (member: Member) => {
    const cleanPhone = member.phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hi ${member.name}, your Iron Pulse Gym membership expires on ${member.expiryDate}. Please renew to keep your membership active.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`, '_blank');
    showToast(`Opening WhatsApp to remind ${member.name}.`);
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
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        expiringCount={members.filter((m) => m.daysLeft <= 7).length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Fixed Header */}
        <Header
          onOpenAddMember={() => setIsAddMemberOpen(true)}
          onOpenSearch={() => setIsQuickSearchOpen(true)}
          onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onOpenBulkWhatsApp={() => setIsBulkWhatsAppOpen(true)}
        />

        {/* View Routing */}
        <main className="w-full pt-16 min-h-screen">
          {activeScreen === 'dashboard' && (
            <DashboardView
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

          {activeScreen === 'memberships' && <MembershipsView />}

          {activeScreen === 'attendance' && (
            <AttendanceView
              checkIns={checkIns}
              members={members}
              onMarkPresent={handleCheckIn}
            />
          )}

          {activeScreen === 'payments' && (
            <PaymentsView
              transactions={transactions}
              onMarkPaid={handleMarkPaid}
              onNewPayment={(txn) => {
                setTransactions((prev) => [txn, ...prev]);
                showToast(`Payment of ₹${txn.amount.toLocaleString('en-IN')} recorded.`);
              }}
            />
          )}

          {activeScreen === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Modals & Drawers */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onAddMember={handleAddMember}
      />

      <BulkWhatsAppModal
        isOpen={isBulkWhatsAppOpen}
        onClose={() => setIsBulkWhatsAppOpen(false)}
        members={members}
      />

      <MemberDetailModal
        member={selectedMember}
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
