'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ActiveScreen, CheckInRecord, Member, MemberRecord, MembershipPlan, NewMemberInput, NewPaymentInput, Transaction, TransactionRecord } from '../types';
import { CurrentUser, GymConfig, GymSettingsInput } from '../config/gym';
import { formatTimestamp, isSameDay } from '../lib/format';
import { toMembers, toTransactions, toCheckInLogs } from '../lib/mappers';
import { computeDashboardStats } from '../lib/stats';
import { addMember, extendMembership, renewMembership, renewMembershipWithDue, updateMember } from '../actions/members';
import { markPaymentPaid, recordPayment } from '../actions/payments';
import { checkInMember, checkInByCode, type ScanCheckInResult } from '../actions/attendance';
import { updateGymSettings } from '../actions/settings';
import { sendMemberReminder } from '../actions/reminders';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardView } from './DashboardView';
import { MembersView } from './MembersView';
import { MembershipsView } from './MembershipsView';
import { PaymentsView } from './PaymentsView';
import { SettingsView } from './SettingsView';
import { EnquiriesView } from './EnquiriesView';
import { SupplementsView } from './SupplementsView';
import { WorkoutPlansView } from './WorkoutPlansView';
import { FloorVelocityView } from './FloorVelocityView';
import { AddMemberModal } from './modals/AddMemberModal';
import { BulkWhatsAppModal } from './modals/BulkWhatsAppModal';
import { MemberDetailModal } from './modals/MemberDetailModal';
import { EditMemberModal } from './modals/EditMemberModal';
import { ImportMembersModal } from './modals/ImportMembersModal';
import { OwnerFeedbackModal } from './modals/OwnerFeedbackModal';
import { QuickSearchModal } from './QuickSearchModal';
import { SendBirthdayWishModal } from './modals/SendBirthdayWishModal';
import { FrontDeskQrModal } from './modals/FrontDeskQrModal';
import { PendingEnrollmentsModal } from './modals/PendingEnrollmentsModal';
import { GymRenewalModal } from './modals/GymRenewalModal';
import { getPendingEnrollments } from '@/actions/enrollments';
import { getSupplementsAndSales } from '@/actions/supplements';
import { getWorkoutAndDietPlans } from '@/actions/workout-plans';
import type { EnrollmentRecord, SupplementItem, SupplementSale, WorkoutPlanItem, DietPlanItem } from '../types';

interface AppProps {
  initialGym: GymConfig;
  currentUser: CurrentUser;
  plans: MembershipPlan[];
  initialMembers: MemberRecord[];
  initialTransactions: TransactionRecord[];
  initialCheckIns: CheckInRecord[];
}

export default function App({ initialGym, currentUser, plans: initialPlans, initialMembers, initialTransactions, initialCheckIns }: AppProps) {
  const isStaff = currentUser.role === 'Staff';
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(isStaff ? 'members' : 'dashboard');

  // Records come from the database (loaded on the server). Everything the UI shows is derived from them.
  const [now, setNow] = useState(() => new Date());
  const [gym, setGym] = useState<GymConfig>(initialGym);
  const [plans, setPlans] = useState<MembershipPlan[]>(initialPlans);
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
  const [bulkWhatsAppTab, setBulkWhatsAppTab] = useState<import('./modals/BulkWhatsAppModal').CampaignType>('renewal');

  const handleOpenBulkWhatsApp = (tab: import('./modals/BulkWhatsAppModal').CampaignType = 'renewal') => {
    setBulkWhatsAppTab(tab);
    setIsBulkWhatsAppOpen(true);
  };
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [wishingMember, setWishingMember] = useState<Member | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Front Desk QR & Pending Self-Enrollments state
  const [isFrontDeskQrOpen, setIsFrontDeskQrOpen] = useState(false);
  const [isPendingEnrollmentsOpen, setIsPendingEnrollmentsOpen] = useState(false);
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);
  const [pendingEnrollments, setPendingEnrollments] = useState<EnrollmentRecord[]>([]);

  // Instant POS & Workout/Diet Plans Cache
  const [cachedSupplements, setCachedSupplements] = useState<SupplementItem[] | null>(null);
  const [cachedSupplementSales, setCachedSupplementSales] = useState<SupplementSale[] | null>(null);
  const [cachedWorkoutPlans, setCachedWorkoutPlans] = useState<WorkoutPlanItem[] | null>(null);
  const [cachedDietPlans, setCachedDietPlans] = useState<DietPlanItem[] | null>(null);

  const fetchPending = async () => {
    try {
      const rows = await getPendingEnrollments();
      setPendingEnrollments(rows);
    } catch (e) {
      console.error('Failed to load pending enrollments:', e);
    }
  };

  useEffect(() => {
    fetchPending();

    // Background preloading to eliminate loading delay on POS and Workout Plans tabs
    getSupplementsAndSales()
      .then((data) => {
        setCachedSupplements(data.supplements);
        setCachedSupplementSales(data.sales);
      })
      .catch((err) => console.error('Background prefetch supplements error:', err));

    getWorkoutAndDietPlans()
      .then((data) => {
        setCachedWorkoutPlans(data.workoutPlans);
        setCachedDietPlans(data.dietPlans);
      })
      .catch((err) => console.error('Background prefetch workout/diet plans error:', err));
  }, []);

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
    const newTxns: TransactionRecord[] = [];
    if (res.payment) newTxns.push(res.payment);
    if (res.duePayment) newTxns.push(res.duePayment);
    if (newTxns.length > 0) {
      setTxnRecords((prev) => [...newTxns, ...prev]);
    }
    showToast(
      res.member.biometricId
        ? `${res.member.name} registered. Enroll them on the machine as ID ${res.member.biometricId}.`
        : `${res.member.name} registered as a member.`
    );
    return true;
  };

  const handleUpdateMember = async (
    memberId: string,
    input: {
      name: string;
      phone: string;
      email: string;
      dob?: string | null;
      timingSlot?: 'MORNING' | 'EVENING' | 'BOTH' | string | null;
      weight?: number | null;
      height?: number | null;
      bmi?: number | null;
      bmiCategory?: string | null;
      biometricId?: string | null;
    }
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

  const handleRenewWithDue = async (input: {
    memberId: string;
    customRenewalDays?: number;
    discountAmount?: number;
    isPartialPayment?: boolean;
    amountPaidNow?: number;
  }): Promise<boolean> => {
    const key = `renew-due:${input.memberId}`;
    if (inFlight.current.has(key)) return false;
    inFlight.current.add(key);
    try {
      const res = await renewMembershipWithDue(input);
      if ('error' in res) {
        showToast(res.error);
        return false;
      }
      setMemberRecords((prev) =>
        prev.map((m) => (m.id === input.memberId ? { ...m, expiresAt: res.expiresAt } : m))
      );
      const newTxns: TransactionRecord[] = [];
      if (res.paidPayment) newTxns.push(res.paidPayment);
      if (res.duePayment) newTxns.push(res.duePayment);
      if (newTxns.length > 0) {
        setTxnRecords((prev) => [...newTxns, ...prev]);
      }
      const name = memberRecords.find((m) => m.id === input.memberId)?.name ?? 'Member';
      showToast(`${name}'s membership renewed successfully.`);
      return true;
    } finally {
      inFlight.current.delete(key);
    }
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

  const handleCheckInByCode = async (rawCode: string): Promise<ScanCheckInResult> => {
    const res = await checkInByCode(rawCode);
    if (res.ok) {
      setCheckInRecords((prev) => [res.checkIn, ...prev]);
      showToast(`${res.member.name} marked present!`);
    }
    return res;
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

  const handleExtendMembership = async (memberId: string, days: number): Promise<boolean> => {
    const key = `extend:${memberId}`;
    if (inFlight.current.has(key)) return false;
    inFlight.current.add(key);
    try {
      const res = await extendMembership(memberId, days);
      if ('error' in res) {
        showToast(res.error);
        return false;
      }
      setMemberRecords((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, expiresAt: res.expiresAt } : m))
      );
      const name = memberRecords.find((m) => m.id === memberId)?.name ?? 'Member';
      showToast(`${name}'s plan extended by +${days} days.`);
      return true;
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

  const handleRecordPayment = async (input: NewPaymentInput): Promise<Transaction | null> => {
    const res = await recordPayment(input);
    if ('error' in res) {
      showToast(res.error);
      return null;
    }
    const payment = res.payment;
    setTxnRecords((prev) => [payment, ...prev]);
    showToast(`Payment of ₹${payment.amount.toLocaleString('en-IN')} recorded for ${payment.memberName}.`);
    return {
      ...payment,
      timestamp: formatTimestamp(payment.createdAt, now),
    };
  };

  const handleSendSingleReminder = (member: Member) => {
    // Also save reminder to database so it shows in member portal notifications
    sendMemberReminder(member.id).catch((err) => console.error('Failed to create member reminder record:', err));

    const cleanPhone = member.phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hi ${member.name}, your ${gym.name} membership expires on ${member.expiryDate}. Please renew to keep your membership active.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`, '_blank');
    showToast(`Reminder sent to ${member.name} (WhatsApp & Member Portal).`);
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
        <div className="fixed top-20 right-6 z-50 bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-tertiary text-xl">check_circle</span>
          <span className="text-xs font-semibold text-on-surface">{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar
        gym={gym}
        userRole={currentUser.role}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        expiringCount={stats.expiringThisWeek}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Fixed Header */}
        <Header
          user={currentUser}
          stats={stats}
          onOpenAddMember={() => setIsAddMemberOpen(true)}
          showAddMember={activeScreen !== 'members'}
          onOpenSearch={() => setIsQuickSearchOpen(true)}
          onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onOpenBulkWhatsApp={() => setIsBulkWhatsAppOpen(true)}
          onNavigateScreen={setActiveScreen}
          onOpenFeedback={() => setIsFeedbackModalOpen(true)}
          onOpenFrontDeskQr={() => setIsFrontDeskQrOpen(true)}
          onOpenRenewalModal={() => setIsRenewalOpen(true)}
          pendingEnrollmentsCount={pendingEnrollments.length}
          gym={gym}
        />

        {/* View Routing */}
        <main className="w-full pt-16 min-h-screen">
          {/* Staff Panel is restricted: if staff tries to open dashboard/payments/settings, fall back to members */}
          {activeScreen === 'dashboard' && (
            isStaff ? (
              <MembersView
                members={members}
                plans={plans}
                checkIns={checkIns}
                todayCheckInsCount={todayCheckIns.length}
                onSelectMember={(m) => setSelectedMember(m)}
                onOpenAddMember={() => setIsAddMemberOpen(true)}
                onOpenImport={() => setIsImportOpen(true)}
                onOpenBulkWhatsApp={handleOpenBulkWhatsApp}
                onSendSingleReminder={handleSendSingleReminder}
                onWishBirthday={(m) => setWishingMember(m)}
                gymSlug={gym.slug}
                onCheckInByCode={handleCheckInByCode}
                onOpenFrontDeskQr={() => setIsFrontDeskQrOpen(true)}
                onOpenPendingEnrollments={() => setIsPendingEnrollmentsOpen(true)}
                pendingEnrollmentsCount={pendingEnrollments.length}
              />
            ) : (
              <DashboardView
                gym={gym}
                onGymUpdate={setGym}
                stats={stats}
                members={members}
                transactions={transactions}
                checkIns={checkIns}
                onOpenBulkWhatsApp={handleOpenBulkWhatsApp}
                onViewAllExpiring={() => setActiveScreen('members')}
                onSelectMember={(m) => setSelectedMember(m)}
                onSendSingleReminder={handleSendSingleReminder}
                onOpenAddMember={() => setIsAddMemberOpen(true)}
                onOpenImport={() => setIsImportOpen(true)}
                onNavigateScreen={setActiveScreen}
                pendingEnrollments={pendingEnrollments}
                onOpenPendingEnrollments={() => setIsPendingEnrollmentsOpen(true)}
                onOpenFrontDeskQr={() => setIsFrontDeskQrOpen(true)}
              />
            )
          )}

          {(activeScreen === 'members' || activeScreen === 'attendance') && (
            <MembersView
              members={members}
              plans={plans}
              checkIns={checkIns}
              todayCheckInsCount={todayCheckIns.length}
              onSelectMember={(m) => setSelectedMember(m)}
              onOpenAddMember={() => setIsAddMemberOpen(true)}
              onOpenImport={() => setIsImportOpen(true)}
              onOpenBulkWhatsApp={handleOpenBulkWhatsApp}
              onSendSingleReminder={handleSendSingleReminder}
              onWishBirthday={(m) => setWishingMember(m)}
              gymSlug={gym.slug}
              onCheckInByCode={handleCheckInByCode}
              onOpenFrontDeskQr={() => setIsFrontDeskQrOpen(true)}
              onOpenPendingEnrollments={() => setIsPendingEnrollmentsOpen(true)}
              pendingEnrollmentsCount={pendingEnrollments.length}
            />
          )}

          {activeScreen === 'memberships' && (
            <MembershipsView
              plans={plans}
              members={members}
              canEdit={currentUser.role === 'Gym Owner'}
            />
          )}

          {activeScreen === 'supplements' && (
            <SupplementsView
              gymName={gym.name}
              members={members}
              isOwner={currentUser.role === 'Gym Owner'}
              initialSupplements={cachedSupplements || undefined}
              initialSales={cachedSupplementSales || undefined}
              onDataUpdated={(sups, sls) => {
                setCachedSupplements(sups);
                setCachedSupplementSales(sls);
              }}
            />
          )}

          {activeScreen === 'workout-plans' && (
            <WorkoutPlansView
              gymName={gym.name}
              members={members}
              isOwner={currentUser.role === 'Gym Owner'}
              initialWorkoutPlans={cachedWorkoutPlans || undefined}
              initialDietPlans={cachedDietPlans || undefined}
              onPlansUpdated={(workouts, diets) => {
                setCachedWorkoutPlans(workouts);
                setCachedDietPlans(diets);
              }}
            />
          )}

          {activeScreen === 'floor-velocity' && (
            <FloorVelocityView
              gymName={gym.name}
              gymSlug={gym.slug}
              stats={stats}
              members={members}
              checkIns={checkIns}
              onCheckInByCode={handleCheckInByCode}
            />
          )}

          {activeScreen === 'payments' && (
            !isStaff ? (
              <PaymentsView
                gym={gym}
                plans={plans}
                members={members}
                transactions={transactions}
                onMarkPaid={handleMarkPaid}
                onNewPayment={handleRecordPayment}
              />
            ) : null
          )}

          {activeScreen === 'enquiries' && (
            !isStaff ? (
              <EnquiriesView
                gymName={gym.name}
                plans={plans}
                onConvertMember={(_data) => {
                  setIsAddMemberOpen(true);
                }}
              />
            ) : null
          )}

          {activeScreen === 'settings' && (
            !isStaff ? (
              <SettingsView
                gym={gym}
                onSave={handleSaveSettings}
                isOwner={currentUser.role === 'Gym Owner'}
              />
            ) : null
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        plans={plans}
        onClose={() => setIsAddMemberOpen(false)}
        onAddMember={handleAddMember}
      />

      <ImportMembersModal
        isOpen={isImportOpen}
        plans={plans}
        members={members}
        onClose={() => setIsImportOpen(false)}
        onImported={(imported, newPlans) => {
          setMemberRecords((prev) => [...imported, ...prev]);
          if (newPlans && newPlans.length > 0) {
            setPlans((prev) => [...prev, ...newPlans]);
          }
          showToast(`${imported.length} members imported${newPlans?.length ? ` and ${newPlans.length} plans created.` : '.'}`);
        }}
      />

      <BulkWhatsAppModal
        isOpen={isBulkWhatsAppOpen}
        gymName={gym.name}
        onClose={() => setIsBulkWhatsAppOpen(false)}
        members={members}
        initialTab={bulkWhatsAppTab}
      />

      <MemberDetailModal
        member={selectedMemberLive}
        gymName={gym.name}
        onClose={() => setSelectedMember(null)}
        onRenewPlan={handleRenewPlan}
        onRenewWithDue={handleRenewWithDue}
        onExtendMembership={handleExtendMembership}
        onEdit={(m) => setEditingMemberId(m.id)}
        onWishBirthday={(m) => setWishingMember(m)}
        recentLogs={checkIns}
      />

      <SendBirthdayWishModal
        isOpen={!!wishingMember}
        member={wishingMember}
        gymName={gym.name}
        onClose={() => setWishingMember(null)}
        onToast={showToast}
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

      <OwnerFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        gymName={gym.name}
      />

      {/* Front Desk Downloadable Standee QR Modal */}
      <FrontDeskQrModal
        gym={gym}
        isOpen={isFrontDeskQrOpen}
        onClose={() => setIsFrontDeskQrOpen(false)}
        pendingCount={pendingEnrollments.length}
        onOpenPendingList={() => setIsPendingEnrollmentsOpen(true)}
      />

      {/* Pending Self-Enrollments Review & Approval Modal */}
      <PendingEnrollmentsModal
        isOpen={isPendingEnrollmentsOpen}
        onClose={() => setIsPendingEnrollmentsOpen(false)}
        enrollments={pendingEnrollments}
        onRefresh={fetchPending}
        onMemberApproved={() => {
          fetchPending();
          window.location.reload();
        }}
        showToast={showToast}
      />

      {/* Gym Owner SaaS Subscription Renewal Modal */}
      <GymRenewalModal
        isOpen={isRenewalOpen}
        onClose={() => setIsRenewalOpen(false)}
        gym={gym}
        user={currentUser}
      />
    </div>
  );
}
