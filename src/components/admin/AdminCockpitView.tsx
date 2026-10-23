'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  approveSaaSSubscription,
  toggleGymSuspension,
  sendAdminMessage,
  replyToOwnerFeedback,
  fetchGymMembersForAdmin,
  deleteGymMemberByAdmin,
  createGymByAdmin,
} from '@/actions/admin';

export interface AdminGymRow {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  joined: string;
  membersCount: number;
  activeMembersCount: number;
  checkInsLast7d: number;
  lastActiveDaysAgo: number | null;
  saasPlan: string;
  saasStatus: string;
  saasExpiresAt: string | null;
  saasApprovedAt: string | null;
  isSuspended: boolean;
  subscriptionAmount: number;
}

export interface AdminFeedbackRow {
  id: string;
  gymId: string;
  gymName: string;
  gymSlug: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
}

export interface AdminBroadcastRow {
  id: string;
  gymId: string | null;
  gymName: string | null;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

interface AdminCockpitViewProps {
  gyms: AdminGymRow[];
  feedbacks: AdminFeedbackRow[];
  broadcasts: AdminBroadcastRow[];
  stats: {
    totalGyms: number;
    activeGyms: number;
    suspendedGyms: number;
    totalMembers: number;
    activeMembers: number;
    totalCheckIns7d: number;
    pendingApprovalsCount: number;
    openFeedbacksCount: number;
  };
}

export const AdminCockpitView: React.FC<AdminCockpitViewProps> = ({
  gyms: initialGyms,
  feedbacks: initialFeedbacks,
  broadcasts: initialBroadcasts,
  stats: initialStats,
}) => {
  const [gyms, setGyms] = useState<AdminGymRow[]>(initialGyms);
  const [feedbacks, setFeedbacks] = useState<AdminFeedbackRow[]>(initialFeedbacks);
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastRow[]>(initialBroadcasts);
  const [activeTab, setActiveTab] = useState<'FLEET' | 'FEEDBACK' | 'BROADCAST' | 'AUDIT'>('FLEET');

  // Search & Filters
  const [gymSearch, setGymSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'TRIAL' | 'SUSPENDED'>('ALL');
  const [feedbackFilter, setFeedbackFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  // Modals state
  const [inspectGym, setInspectGym] = useState<AdminGymRow | null>(null);
  const [inspectMembers, setInspectMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // Message modal
  const [messageTargetGym, setMessageTargetGym] = useState<AdminGymRow | null>(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgPriority, setMsgPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Reply modal
  const [replyTargetFeedback, setReplyTargetFeedback] = useState<AdminFeedbackRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Expiring in 48h modal state
  const [showExpiring48hModal, setShowExpiring48hModal] = useState(false);

  // Onboard Gym Modal
  const [showCreateGymModal, setShowCreateGymModal] = useState(false);
  const [newGymName, setNewGymName] = useState('');
  const [newGymSlug, setNewGymSlug] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSaasPlan, setNewSaasPlan] = useState<string>('BASE_6M');
  const [newDurationMonths, setNewDurationMonths] = useState<number>(7);
  const [newSubscriptionAmount, setNewSubscriptionAmount] = useState<number>(2399);
  const [creatingGym, setCreatingGym] = useState(false);
  const [createGymError, setCreateGymError] = useState('');
  const [requiresAdminLogin, setRequiresAdminLogin] = useState(false);

  const handlePlanChange = (p: string) => {
    setNewSaasPlan(p);
    if (p === 'BASE_1M') {
      setNewDurationMonths(1);
      setNewSubscriptionAmount(999);
    } else if (p === 'BASE_6M') {
      setNewDurationMonths(7); // 6 + 1 month free demo
      setNewSubscriptionAmount(2399);
    } else if (p === 'BASE_1Y') {
      setNewDurationMonths(13); // 12 + 1 month free demo
      setNewSubscriptionAmount(3499);
    } else if (p === 'PRO_6M') {
      setNewDurationMonths(6);
      setNewSubscriptionAmount(3499);
    } else if (p === 'PRO_1Y') {
      setNewDurationMonths(12);
      setNewSubscriptionAmount(5499);
    } else {
      setNewDurationMonths(1);
      setNewSubscriptionAmount(0);
    }
  };

  const handleNewGymNameChange = (val: string) => {
    setNewGymName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 20).replace(/^-+|-+$/g, '');
    if (!newGymSlug || newGymSlug === autoSlug.slice(0, newGymSlug.length)) {
      setNewGymSlug(autoSlug);
    }
  };

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGymName.trim() || !newGymSlug.trim() || !newOwnerName.trim() || !newOwnerEmail.trim()) {
      showToast('Please fill in Gym Name, Slug, Owner Name, and Email.');
      return;
    }
    if (creatingGym) return;
    setCreateGymError('');
    setRequiresAdminLogin(false);
    setCreatingGym(true);
    try {
    const res = await createGymByAdmin({
      gymName: newGymName,
      slug: newGymSlug,
      ownerName: newOwnerName,
      email: newOwnerEmail,
      phone: newOwnerPhone,
      password: newPassword,
      saasPlan: newSaasPlan,
      subscriptionAmount: newSubscriptionAmount,
      durationMonths: newDurationMonths,
    });
    setCreatingGym(false);
    if (res.ok) {
      showToast(`⚡ Gym "${newGymName}" onboarded & activated successfully!`);
      setShowCreateGymModal(false);
      setGymSearch('');
      setStatusFilter('ALL');
      setGyms((prev) => [
        {
          id: res.gymId || String(Date.now()),
          name: newGymName,
          slug: res.slug || newGymSlug,
          ownerName: newOwnerName,
          ownerEmail: res.email || newOwnerEmail,
          ownerPhone: newOwnerPhone || '',
          joined: new Date().toISOString(),
          membersCount: 0,
          activeMembersCount: 0,
          checkInsLast7d: 0,
          lastActiveDaysAgo: 0,
          saasPlan: newSaasPlan,
          saasStatus: 'ACTIVE',
          saasExpiresAt: new Date(Date.now() + newDurationMonths * 30 * 86400000).toISOString(),
          saasApprovedAt: new Date().toISOString(),
          isSuspended: false,
          subscriptionAmount: newSubscriptionAmount,
        },
        ...prev,
      ]);
      setNewGymName('');
      setNewGymSlug('');
      setNewOwnerName('');
      setNewOwnerEmail('');
      setNewOwnerPhone('');
      setNewPassword('');
    } else {
      setCreateGymError(res.error || 'Failed to onboard gym.');
      setRequiresAdminLogin(Boolean(res.requiresAdminLogin));
    }
    } catch {
      setCreateGymError('Could not reach the server. Please retry.');
    } finally {
      setCreatingGym(false);
    }
  };

  // 1-Click Approve Subscription
  const handleApproveSubscription = async (gym: AdminGymRow, plan = 'SEMI_ANNUAL', months = 6) => {
    const res = await approveSaaSSubscription(gym.id, plan, months);
    if (res.ok) {
      showToast(`⚡ Services activated for ${gym.name}!`);
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gym.id
            ? {
                ...g,
                saasStatus: 'ACTIVE',
                saasPlan: plan,
                isSuspended: false,
                saasExpiresAt: new Date(Date.now() + months * 30 * 86400000).toISOString(),
              }
            : g
        )
      );
    } else {
      showToast(res.error || 'Failed to approve');
    }
  };

  // Toggle Suspension
  const handleToggleSuspend = async (gym: AdminGymRow) => {
    const nextState = !gym.isSuspended;
    const res = await toggleGymSuspension(gym.id, nextState);
    if (res.ok) {
      showToast(nextState ? `Suspended ${gym.name}` : `Re-activated ${gym.name}`);
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gym.id
            ? {
                ...g,
                isSuspended: nextState,
                saasStatus: nextState ? 'SUSPENDED' : 'ACTIVE',
              }
            : g
        )
      );
    }
  };

  // View Members of a Gym
  const handleInspectMembers = async (gym: AdminGymRow) => {
    setInspectGym(gym);
    setLoadingMembers(true);
    const res = await fetchGymMembersForAdmin(gym.id);
    setLoadingMembers(false);
    if (res.ok) {
      setInspectMembers(res.members);
    }
  };

  // Delete Member Data in a Particular Gym
  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!inspectGym) return;
    const confirmed = window.confirm(
      `⚠️ Permanently delete member "${memberName}" from "${inspectGym.name}"?\n\nThis will completely purge all attendance, payments, passes, and records for this member.`
    );
    if (!confirmed) return;

    setDeletingMemberId(memberId);
    const res = await deleteGymMemberByAdmin(inspectGym.id, memberId);
    setDeletingMemberId(null);

    if (res.ok) {
      showToast(res.message || `Member "${memberName}" deleted successfully.`);
      setInspectMembers((prev) => prev.filter((m) => m.id !== memberId));
      setGyms((prev) =>
        prev.map((g) =>
          g.id === inspectGym.id
            ? { ...g, membersCount: Math.max(0, g.membersCount - 1) }
            : g
        )
      );
    } else {
      showToast(res.error || 'Failed to delete member.');
    }
  };

  // Send Direct Message / Broadcast
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle.trim() || !msgBody.trim()) return;

    setSendingMsg(true);
    const res = await sendAdminMessage({
      gymId: messageTargetGym ? messageTargetGym.id : null,
      title: msgTitle.trim(),
      message: msgBody.trim(),
      priority: msgPriority,
    });
    setSendingMsg(false);

    if (res.ok) {
      showToast(
        messageTargetGym
          ? `Message delivered to ${messageTargetGym.name} nav bar!`
          : 'Broadcast sent to all gym owners!'
      );
      setBroadcasts((prev) => [
        {
          id: res.messageId || String(Date.now()),
          gymId: messageTargetGym ? messageTargetGym.id : null,
          gymName: messageTargetGym ? messageTargetGym.name : 'All Gyms (Broadcast)',
          title: msgTitle.trim(),
          message: msgBody.trim(),
          priority: msgPriority,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setMessageTargetGym(null);
      setMsgTitle('');
      setMsgBody('');
    }
  };

  // Reply to Owner Feedback
  const handleReplyFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTargetFeedback || !replyText.trim()) return;

    setSendingReply(true);
    const res = await replyToOwnerFeedback(replyTargetFeedback.id, replyText.trim(), true);
    setSendingReply(false);

    if (res.ok) {
      showToast('Reply sent to gym owner navigation bar & ticket resolved!');
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === replyTargetFeedback.id
            ? { ...f, adminReply: replyText.trim(), status: 'RESOLVED' }
            : f
        )
      );
      setReplyTargetFeedback(null);
      setReplyText('');
    }
  };

  // Filtered Gyms
  const filteredGyms = gyms.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(gymSearch.toLowerCase()) ||
      g.slug.toLowerCase().includes(gymSearch.toLowerCase()) ||
      g.ownerName.toLowerCase().includes(gymSearch.toLowerCase()) ||
      g.ownerPhone.includes(gymSearch);

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = g.saasStatus === 'ACTIVE' && !g.isSuspended;
    if (statusFilter === 'PENDING') matchesStatus = g.saasStatus === 'PENDING_APPROVAL';
    if (statusFilter === 'TRIAL') matchesStatus = g.saasStatus === 'TRIAL' || g.saasPlan.includes('TRIAL');
    if (statusFilter === 'SUSPENDED') matchesStatus = g.isSuspended || g.saasStatus === 'SUSPENDED';

    return matchesSearch && matchesStatus;
  });

  // Filtered Feedbacks
  const filteredFeedbacks = feedbacks.filter((f) => {
    if (feedbackFilter === 'OPEN') return f.status !== 'RESOLVED';
    if (feedbackFilter === 'RESOLVED') return f.status === 'RESOLVED';
    return true;
  });

  // Gyms expiring within 48 hours
  const expiring48hGyms = gyms.filter((g) => {
    if (!g.saasExpiresAt) return false;
    const expiresAtMs = new Date(g.saasExpiresAt).getTime();
    if (isNaN(expiresAtMs)) return false;
    const diffHours = (expiresAtMs - Date.now()) / (3600 * 1000);
    return diffHours <= 48 && diffHours >= -48;
  });

  const handleOpenPrefilledReminder = (gym: AdminGymRow) => {
    setShowExpiring48hModal(false);
    setMessageTargetGym(gym);
    setMsgTitle('⚠️ NeuraFitness SaaS Subscription Expiring Soon');
    setMsgBody(
      `Dear ${gym.ownerName},\n\nYour NeuraFitness subscription for ${gym.name} is expiring in under 48 hours. Please renew your plan to prevent any interruption in your biometric turnstiles, attendance sync, and member passes.\n\nBase Plans: 1M Demo (₹999), 6M (+1M Free: ₹2,399), 1Yr (+1M Free: ₹3,499)\nPro Plans: 6M (₹3,499 - 1 Free Customization), 1Yr (₹5,499 - 2 Free Customizations)\n\nTap the Renew button in your notification bell or contact NeuraFitness directly.`
    );
    setMsgPriority('URGENT');
  };

  const handleSendWhatsAppReminder = (gym: AdminGymRow) => {
    const cleanPhone = gym.ownerPhone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hi ${gym.ownerName}, greeting from NeuraFitness Co-Founders! Your gym's SaaS subscription for ${gym.name} is expiring within 48 hours. Please renew your plan (Base or Pro) to avoid any interruption to your biometric turnstiles and member check-ins. Please let us know if you would like us to renew your plan today!`
    );
    window.open(`https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${text}`, '_blank');
  };

  const applyPresetMessage = (preset: 'EXPIRED' | 'EXPIRING' | 'RENEWED') => {
    const owner = messageTargetGym?.ownerName || 'Gym Owner';
    const gymName = messageTargetGym?.name || 'your gym';
    if (preset === 'EXPIRED') {
      setMsgTitle('🚨 Gym Membership Expired — Renewal Required');
      setMsgBody(
        `Dear ${owner},\n\nYour NeuraFitness SaaS membership subscription for ${gymName} has expired. Turnstile biometrics and cloud software are pending renewal.\n\nPlease click the Renew button in your notifications to choose a Base or Pro plan and restore uninterrupted access.`
      );
      setMsgPriority('URGENT');
    } else if (preset === 'EXPIRING') {
      setMsgTitle('⚠️ Gym Membership Expiring within 48 Hours');
      setMsgBody(
        `Dear ${owner},\n\nThis is a priority reminder that your NeuraFitness SaaS membership subscription for ${gymName} will expire within 48 hours.\n\nPlease renew your subscription to maintain uninterrupted biometric sync, turnstiles, and member passes.`
      );
      setMsgPriority('HIGH');
    } else if (preset === 'RENEWED') {
      setMsgTitle('🎉 Gym Membership Renewed Successfully!');
      setMsgBody(
        `Dear ${owner},\n\nThank you for renewing your NeuraFitness membership subscription for ${gymName}! Your cloud features, digital passes, and turnstile biometrics are fully active. Thank you for partnering with NeuraFitness.`
      );
      setMsgPriority('NORMAL');
    }
  };

  const getPlanBadge = (plan: string) => {
    const p = (plan || '').toUpperCase();
    if (p.includes('PRO_1Y') || p.includes('5499') || (p.includes('PRO') && p.includes('1Y')))
      return { label: 'Pro 1-Year (₹5,499)', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    if (p.includes('PRO_6M') || (p.includes('PRO') && p.includes('6M')))
      return { label: 'Pro 6-Month (₹3,499)', bg: 'bg-primary/15 text-primary border-primary/30' };
    if (p.includes('BASE_1Y') || (p.includes('3499') && p.includes('BASE')))
      return { label: 'Base 1-Year (₹3,499)', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    if (p.includes('BASE_6M') || p.includes('2399'))
      return { label: 'Base 6-Month (₹2,399)', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
    if (p.includes('BASE_1M') || p.includes('999'))
      return { label: 'Base 1-Mo Demo (₹999)', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    if (p.includes('ANNUAL'))
      return { label: '1-Year Annual (₹3,499)', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    if (p.includes('SEMI'))
      return { label: '6-Month Plan (₹2,399)', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
    if (p.includes('TRIAL'))
      return { label: 'Demo Trial', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    return { label: plan || 'Standard', bg: 'bg-secondary/15 text-secondary border-secondary/30' };
  };

  return (
    <div className="min-h-screen bg-background text-on-surface p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Toast Notice */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-surface-container-highest border border-secondary text-secondary text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Cockpit Header & Flight Deck HUD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-md bg-secondary text-on-secondary font-mono text-[10px] font-bold uppercase tracking-widest">
              SUPERADMIN COCKPIT
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-outline font-mono">ALL SYSTEMS NOMINAL</span>
          </div>
          <h1 className="font-sora text-2xl sm:text-3xl font-extrabold text-on-surface mt-1.5 flex items-center gap-2">
            <span>NeuraFitness Master Cockpit</span>
            <span className="material-symbols-outlined text-secondary text-2xl">flight_takeoff</span>
          </h1>
          <p className="text-xs sm:text-sm text-outline mt-0.5">
            Full platform flight control: gyms, subscriptions, 1-click approvals, member rosters, and owner communications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setMessageTargetGym(null);
              setMsgTitle('');
              setMsgBody('');
            }}
            className="px-3.5 py-2 rounded-xl bg-secondary/15 hover:bg-secondary/25 border border-secondary/30 text-secondary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">campaign</span>
            <span>Broadcast Announcement</span>
          </button>

          <Link
            href="/"
            className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-base">storefront</span>
            <span>Return to Gym App</span>
          </Link>
        </div>
      </div>

      {/* Cockpit HUD Gauges / Flight Instruments */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
          <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
            Fleet Gyms
          </span>
          <span className="font-sora text-2xl font-black text-on-surface mt-1 block">
            {initialStats.totalGyms}
          </span>
          <span className="text-[10px] text-outline mt-0.5 block">
            {initialStats.activeGyms} Active · {initialStats.suspendedGyms} Suspended
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-secondary/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
            Total Members
          </span>
          <span className="font-sora text-2xl font-black text-secondary mt-1 block">
            {initialStats.totalMembers}
          </span>
          <span className="text-[10px] text-outline mt-0.5 block">
            {initialStats.activeMembers} currently active
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-tertiary/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary block">
            Punches (7 Days)
          </span>
          <span className="font-sora text-2xl font-black text-tertiary mt-1 block">
            {initialStats.totalCheckIns7d}
          </span>
          <span className="text-[10px] text-outline mt-0.5 block">Biometric & Terminal syncs</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-amber-500/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
            Pending Approvals
          </span>
          <span className="font-sora text-2xl font-black text-amber-400 mt-1 block">
            {initialStats.pendingApprovalsCount}
          </span>
          <span className="text-[10px] text-outline mt-0.5 block">1-Click activation ready</span>
        </div>

        {/* Expiring within 48 Hours Box (Click for Popup with Prefilled Reminders) */}
        <div
          onClick={() => setShowExpiring48hModal(true)}
          className={`p-4 rounded-xl cursor-pointer transition-all border relative overflow-hidden group ${
            expiring48hGyms.length > 0
              ? 'bg-amber-500/10 border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/15 ring-1 ring-amber-500/30 shadow-md'
              : 'bg-surface-container-low border-surface-container-high hover:border-surface-container-highest'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Expiring ≤ 48h
            </span>
            {expiring48hGyms.length > 0 ? (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            ) : (
              <span className="material-symbols-outlined text-outline text-sm">schedule</span>
            )}
          </div>
          <span className="font-sora text-2xl font-black text-amber-400 mt-1 block">
            {expiring48hGyms.length}
          </span>
          <span className="text-[10px] text-outline mt-0.5 flex items-center gap-1 group-hover:text-on-surface">
            <span>Reminder Popup</span>
            <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-error/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-error block">
            Owner Tickets
          </span>
          <span className="font-sora text-2xl font-black text-error mt-1 block">
            {initialStats.openFeedbacksCount}
          </span>
          <span className="text-[10px] text-outline mt-0.5 block">Awaiting co-founder reply</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
          <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
            Platform Security
          </span>
          <span className="font-sora text-base font-bold text-emerald-400 mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">shield</span>
            <span>Enforced</span>
          </span>
          <span className="text-[10px] text-outline mt-0.5 block">Tenant Isolation Verified</span>
        </div>
      </div>

      {/* Cockpit Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-container-high pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('FLEET')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'FLEET'
              ? 'bg-secondary text-on-secondary font-bold shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">fitness_center</span>
          <span>Gym Fleet & Subscriptions</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
            {gyms.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('FEEDBACK')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'FEEDBACK'
              ? 'bg-secondary text-on-secondary font-bold shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">support_agent</span>
          <span>Owner Feedback & Queries</span>
          {initialStats.openFeedbacksCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-error text-white font-mono font-bold">
              {initialStats.openFeedbacksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('BROADCAST')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'BROADCAST'
              ? 'bg-secondary text-on-secondary font-bold shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">campaign</span>
          <span>Broadcast Log & Messaging</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
            {broadcasts.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Gym Fleet & SaaS Subscriptions */}
      {activeTab === 'FLEET' && (
        <div className="space-y-4">
          {/* Controls: Search and Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Search by gym name, slug, owner phone..."
                value={gymSearch}
                onChange={(e) => setGymSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between w-full sm:w-auto">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {(['ALL', 'ACTIVE', 'PENDING', 'TRIAL', 'SUSPENDED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-surface-container-high text-secondary border border-secondary/40'
                        : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    {st === 'ALL' ? 'All Gyms' : st === 'PENDING' ? 'Pending Approval' : st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowCreateGymModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <span className="material-symbols-outlined text-sm font-bold">add_circle</span>
                <span>Onboard New Gym</span>
              </button>
            </div>
          </div>

          {/* Gym Table */}
          <div className="rounded-2xl border border-surface-container-high bg-surface-container-lowest overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-outline bg-surface-container-low border-b border-surface-container-high">
                    <th className="px-4 py-3.5">Gym Info</th>
                    <th className="px-4 py-3.5">Owner Contact</th>
                    <th className="px-4 py-3.5">Members</th>
                    <th className="px-4 py-3.5">SaaS Plan</th>
                    <th className="px-4 py-3.5">SaaS Status</th>
                    <th className="px-4 py-3.5">Expiry</th>
                    <th className="px-4 py-3.5 text-right">Cockpit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredGyms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-outline">
                        No gyms matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredGyms.map((g) => {
                      const badge = getPlanBadge(g.saasPlan);
                      return (
                        <tr
                          key={g.id}
                          className="hover:bg-surface-container-low/50 transition-colors"
                        >
                          {/* Gym Info */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                {g.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-on-surface text-sm">{g.name}</p>
                                <p className="font-mono text-[11px] text-secondary">code: {g.slug}</p>
                              </div>
                            </div>
                          </td>

                          {/* Owner Contact */}
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-on-surface">{g.ownerName || 'Unassigned'}</p>
                            <p className="text-[11px] text-outline">{g.ownerEmail}</p>
                            {g.ownerPhone && (
                              <a
                                href={`https://wa.me/91${g.ownerPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline mt-0.5"
                              >
                                <span className="material-symbols-outlined text-xs">chat</span>
                                <span>{g.ownerPhone}</span>
                              </a>
                            )}
                          </td>

                          {/* Members */}
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => handleInspectMembers(g)}
                              className="font-bold text-secondary hover:underline cursor-pointer flex items-center gap-1"
                              title="Click to view full member list"
                            >
                              <span>{g.membersCount} members</span>
                              <span className="material-symbols-outlined text-xs">visibility</span>
                            </button>
                            <span className="text-[10px] text-outline block">
                              {g.checkInsLast7d} visits (7d)
                            </span>
                          </td>

                          {/* SaaS Plan */}
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* SaaS Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                g.isSuspended
                                  ? 'bg-error/15 text-error border border-error/30'
                                  : g.saasStatus === 'ACTIVE'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {g.isSuspended ? 'SUSPENDED' : g.saasStatus}
                            </span>
                          </td>

                          {/* Expiry */}
                          <td className="px-4 py-3.5">
                            <span className="text-on-surface font-medium block">
                              {g.saasExpiresAt
                                ? new Date(g.saasExpiresAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Lifetime / Trial'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* 1-Click Approve Subscription */}
                              {g.saasStatus !== 'ACTIVE' && (
                                <button
                                  onClick={() => handleApproveSubscription(g, 'SEMI_ANNUAL', 6)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                  title="1-Click Approve & Activate SaaS Plan"
                                >
                                  <span className="material-symbols-outlined text-xs">bolt</span>
                                  <span>1-Click Approve</span>
                                </button>
                              )}

                              {/* Send targeted message */}
                              <button
                                onClick={() => {
                                  setMessageTargetGym(g);
                                  setMsgTitle('');
                                  setMsgBody('');
                                }}
                                className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-on-surface transition-colors cursor-pointer"
                                title="Send notification to owner's nav bar"
                              >
                                <span className="material-symbols-outlined text-base">send</span>
                              </button>

                              {/* Inspect members */}
                              <button
                                onClick={() => handleInspectMembers(g)}
                                className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors cursor-pointer"
                                title="Inspect gym member roster"
                              >
                                <span className="material-symbols-outlined text-base">group</span>
                              </button>

                              {/* Suspend / Un-suspend */}
                              <button
                                onClick={() => handleToggleSuspend(g)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  g.isSuspended
                                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                                    : 'bg-error/15 text-error hover:bg-error/25'
                                }`}
                                title={g.isSuspended ? 'Re-activate Gym' : 'Suspend Gym Access'}
                              >
                                <span className="material-symbols-outlined text-base">
                                  {g.isSuspended ? 'lock_open' : 'block'}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Owner Feedback & Queries Support Desk */}
      {activeTab === 'FEEDBACK' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-sora text-base font-bold text-on-surface">
              Gym Owner Queries & Feature Requests ({feedbacks.length})
            </h2>
            <div className="flex items-center gap-1.5 text-xs">
              {(['ALL', 'OPEN', 'RESOLVED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFeedbackFilter(f)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    feedbackFilter === f
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-surface-container-low text-outline hover:text-on-surface'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFeedbacks.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-outline text-xs">
                No owner queries matching this filter.
              </div>
            ) : (
              filteredFeedbacks.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-surface-container-high bg-surface-container-lowest space-y-3 shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface text-xs">{item.gymName}</span>
                        <span className="font-mono text-[10px] text-secondary">({item.gymSlug})</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'RESOLVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-outline">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-outline">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="font-bold text-on-surface text-sm">{item.subject}</h4>
                    <p className="text-xs text-on-surface-variant whitespace-pre-wrap">{item.message}</p>

                    {item.adminReply && (
                      <div className="p-3 rounded-xl bg-surface-container-low border-l-2 border-secondary text-xs space-y-1">
                        <p className="font-bold text-secondary text-[11px]">Your Admin Reply:</p>
                        <p className="text-on-surface whitespace-pre-wrap">{item.adminReply}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-surface-container-high flex items-center justify-end">
                    <button
                      onClick={() => {
                        setReplyTargetFeedback(item);
                        setReplyText(item.adminReply || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">reply</span>
                      <span>{item.adminReply ? 'Update Reply' : 'Reply & Send to Nav Bar'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Broadcast Log & Announcements */}
      {activeTab === 'BROADCAST' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sora text-base font-bold text-on-surface">
              Broadcast Log ({broadcasts.length} Messages)
            </h2>
            <button
              onClick={() => {
                setMessageTargetGym(null);
                setMsgTitle('');
                setMsgBody('');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-secondary text-on-secondary font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">campaign</span>
              <span>New Announcement</span>
            </button>
          </div>

          <div className="divide-y divide-surface-container-high rounded-2xl border border-surface-container-high bg-surface-container-lowest overflow-hidden shadow-lg">
            {broadcasts.length === 0 ? (
              <div className="py-12 text-center text-outline text-xs">
                No announcements or broadcast messages sent yet.
              </div>
            ) : (
              broadcasts.map((b) => (
                <div key={b.id} className="p-4 hover:bg-surface-container-low/40 transition-colors space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary">
                        To: {b.gymName || 'All Gyms (Broadcast)'}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        b.priority === 'URGENT' ? 'bg-error text-white' : 'bg-surface-container-high text-outline'
                      }`}>
                        {b.priority}
                      </span>
                    </div>
                    <span className="text-[10px] text-outline">
                      {new Date(b.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h4 className="font-bold text-on-surface text-xs">{b.title}</h4>
                  <p className="text-xs text-on-surface-variant whitespace-pre-wrap">{b.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Inspect Gym Members */}
      {inspectGym && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setInspectGym(null)}
        >
          <div
            className="w-full max-w-3xl bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low/50">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-2xl">group</span>
                <div>
                  <h3 className="font-sora font-bold text-on-surface text-base">
                    {inspectGym.name} — Member Roster
                  </h3>
                  <p className="text-xs text-outline">
                    {inspectMembers.length} registered members · Code: {inspectGym.slug}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectGym(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loadingMembers ? (
                <div className="py-12 text-center text-outline text-xs flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-2xl animate-spin text-secondary">refresh</span>
                  <span>Fetching member roster...</span>
                </div>
              ) : inspectMembers.length === 0 ? (
                <div className="py-12 text-center text-outline text-xs">
                  No members registered in this gym yet.
                </div>
              ) : (
                <div className="divide-y divide-surface-container-high border border-surface-container-high rounded-xl overflow-hidden">
                  {inspectMembers.map((m) => (
                    <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-surface-container-low text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-on-surface">{m.name}</p>
                          <span className="font-mono text-[10px] text-outline">({m.code})</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            m.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-error/15 text-error'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-outline mt-0.5">
                          {m.phone} · Plan: {m.planName} · Check-ins: {m.totalCheckIns}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-outline block">Expires</span>
                          <span className="font-semibold text-on-surface">
                            {m.expiresAt ? new Date(m.expiresAt).toLocaleDateString('en-IN') : 'No expiry'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          disabled={deletingMemberId === m.id}
                          title={`Delete member ${m.name}`}
                          className="px-2.5 py-1.5 rounded-lg border border-error/30 text-error hover:bg-error/15 disabled:opacity-50 transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {deletingMemberId === m.id ? 'progress_activity' : 'delete'}
                          </span>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Send Message to Gym Owner Nav Bar */}
      {(messageTargetGym !== null || activeTab === 'BROADCAST') && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in ${
            messageTargetGym === null && activeTab !== 'BROADCAST' ? 'hidden' : ''
          }`}
          style={{ display: messageTargetGym || (activeTab === 'BROADCAST' && msgTitle) ? 'flex' : 'none' }}
          onClick={() => {
            setMessageTargetGym(null);
            setMsgTitle('');
            setMsgBody('');
          }}
        >
          <div
            className="w-full max-w-lg bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-2xl">campaign</span>
                <div>
                  <h3 className="font-sora font-bold text-on-surface text-base">
                    {messageTargetGym ? `Message to: ${messageTargetGym.name}` : 'Broadcast to All Gyms'}
                  </h3>
                  <p className="text-xs text-outline">
                    Will appear in the owner&apos;s top navigation bar notification bell
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMessageTargetGym(null);
                  setMsgTitle('');
                  setMsgBody('');
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Preset Message Templates */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                Quick Preset Templates (1-Click Fill)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPresetMessage('EXPIRED')}
                  className="px-2.5 py-2 rounded-xl border border-error/30 hover:border-error bg-error/10 text-error text-[11px] font-bold text-left transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm shrink-0">cancel</span>
                  <span className="truncate">1. Membership Expired</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetMessage('EXPIRING')}
                  className="px-2.5 py-2 rounded-xl border border-amber-500/30 hover:border-amber-500 bg-amber-500/10 text-amber-400 text-[11px] font-bold text-left transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm shrink-0">schedule</span>
                  <span className="truncate">2. Membership Expiring</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetMessage('RENEWED')}
                  className="px-2.5 py-2 rounded-xl border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold text-left transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm shrink-0">verified</span>
                  <span className="truncate">3. Membership Renewed</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  Message Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🎉 Scheduled Platform Maintenance / Notice on Dues"
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  Message Body
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type message content. It will be immediately delivered to the owner's notification dropdown."
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-outline">Priority:</span>
                  {(['NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setMsgPriority(p)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        msgPriority === p
                          ? p === 'URGENT' ? 'bg-error text-white' : 'bg-secondary text-on-secondary'
                          : 'bg-surface-container text-outline'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMessageTargetGym(null);
                      setMsgTitle('');
                      setMsgBody('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingMsg}
                    className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>{sendingMsg ? 'Delivering...' : 'Send to Nav Bar'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reply to Owner Feedback */}
      {replyTargetFeedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setReplyTargetFeedback(null)}
        >
          <div
            className="w-full max-w-lg bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-2xl">reply</span>
                <div>
                  <h3 className="font-sora font-bold text-on-surface text-base">
                    Reply to {replyTargetFeedback.gymName}
                  </h3>
                  <p className="text-xs text-outline">
                    Subject: &quot;{replyTargetFeedback.subject}&quot;
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplyTargetFeedback(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant">
              <span className="font-bold text-outline block text-[10px] uppercase">Owner Message:</span>
              <p className="mt-1 whitespace-pre-wrap">{replyTargetFeedback.message}</p>
            </div>

            <form onSubmit={handleReplyFeedback} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  Co-Founder Official Response
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write clear response. This will be posted into the owner's Support Tickets and delivered straight to their navigation bar."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyTargetFeedback(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingReply}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>{sendingReply ? 'Sending...' : 'Reply & Resolve'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 4: Onboard New Gym (After WhatsApp UPI Payment) */}
      {showCreateGymModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowCreateGymModal(false)}
        >
          <div
            className="w-full max-w-lg bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-2xl">add_business</span>
                <div>
                  <h3 className="font-sora font-bold text-on-surface text-base">
                    Onboard New Gym
                  </h3>
                  <p className="text-xs text-outline">
                    Add customer after WhatsApp UPI payment & activate portal instantly
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGymModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateGym} className="space-y-3.5 text-xs">
              {createGymError && <p role="alert" className="text-sm text-red-400">{createGymError}</p>}
              {requiresAdminLogin && <a href="/admin/login" target="_blank" rel="noopener noreferrer" className="block text-sm text-secondary underline">Sign in as super admin in a new tab, then retry</a>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    Gym Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iron Forge Fitness"
                    value={newGymName}
                    onChange={(e) => handleNewGymNameChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    Gym Code / Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ironforge"
                    value={newGymSlug}
                    onChange={(e) =>
                      setNewGymSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    WhatsApp / Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    Owner Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="owner@ironforge.com"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="Unique password (12+ characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  SaaS Subscription Plan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlanChange('BASE_1M')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newSaasPlan === 'BASE_1M'
                        ? 'border-secondary bg-secondary/10 text-on-surface'
                        : 'border-surface-container-high bg-surface-container-low text-outline'
                    }`}
                  >
                    <span className="font-bold block text-xs">Base: 1M Demo</span>
                    <span className="text-[10px] text-secondary">1 Mo · ₹999</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanChange('BASE_6M')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newSaasPlan === 'BASE_6M'
                        ? 'border-secondary bg-secondary/10 text-on-surface'
                        : 'border-surface-container-high bg-surface-container-low text-outline'
                    }`}
                  >
                    <span className="font-bold block text-xs">Base: 6 Months</span>
                    <span className="text-[10px] text-secondary">6+1 Mo · ₹2,399</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanChange('BASE_1Y')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newSaasPlan === 'BASE_1Y'
                        ? 'border-secondary bg-secondary/10 text-on-surface'
                        : 'border-surface-container-high bg-surface-container-low text-outline'
                    }`}
                  >
                    <span className="font-bold block text-xs">Base: 1 Year</span>
                    <span className="text-[10px] text-secondary">12+1 Mo · ₹3,499</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanChange('PRO_6M')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newSaasPlan === 'PRO_6M'
                        ? 'border-primary bg-primary/10 text-on-surface'
                        : 'border-surface-container-high bg-surface-container-low text-outline'
                    }`}
                  >
                    <span className="font-bold block text-xs">Pro: 6 Months</span>
                    <span className="text-[10px] text-primary">1 Custom · ₹3,499</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanChange('PRO_1Y')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newSaasPlan === 'PRO_1Y'
                        ? 'border-primary bg-primary/10 text-on-surface'
                        : 'border-surface-container-high bg-surface-container-low text-outline'
                    }`}
                  >
                    <span className="font-bold block text-xs">Pro: 1 Year</span>
                    <span className="text-[10px] text-primary">2 Custom · ₹5,499</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanChange('TRIAL')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      newSaasPlan === 'TRIAL'
                        ? 'border-secondary bg-secondary/10 text-on-surface'
                        : 'border-surface-container-high bg-surface-container-low text-outline'
                    }`}
                  >
                    <span className="font-bold block text-xs">Free Demo Trial</span>
                    <span className="text-[10px] text-secondary">30 Days · ₹0</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    Amount Collected (₹)
                  </label>
                  <input
                    type="number"
                    value={newSubscriptionAmount}
                    onChange={(e) => setNewSubscriptionAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                    Duration (Months)
                  </label>
                  <input
                    type="number"
                    value={newDurationMonths}
                    onChange={(e) => setNewDurationMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowCreateGymModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-outline hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGym}
                  className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>{creatingGym ? 'Creating & Activating...' : 'Onboard & Activate Gym'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Gym Subscriptions Expiring in 48 Hours */}
      {showExpiring48hModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowExpiring48hModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-surface-container-lowest border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Close Cross Button */}
            <div className="p-4 sm:p-5 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                  <span className="material-symbols-outlined text-2xl">timer</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-sora font-bold text-on-surface text-base sm:text-lg">
                      Gyms Expiring Within 48 Hours
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      {expiring48hGyms.length} Gym{expiring48hGyms.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-outline mt-0.5">
                    SaaS subscriptions expiring in ≤ 48 hrs or expired recently. Send 1-tap reminders.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExpiring48hModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Body: List of Expiring Gyms */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {expiring48hGyms.length === 0 ? (
                <div className="py-12 text-center text-outline text-xs space-y-2">
                  <span className="material-symbols-outlined text-3xl text-emerald-400">check_circle</span>
                  <p className="font-bold text-on-surface text-sm">No Gym Subscriptions Expiring Soon</p>
                  <p>All active gyms have healthy subscription validity beyond 48 hours.</p>
                </div>
              ) : (
                expiring48hGyms.map((g) => {
                  const expiresAtMs = g.saasExpiresAt ? new Date(g.saasExpiresAt).getTime() : 0;
                  const diffHours = Math.round((expiresAtMs - Date.now()) / (3600 * 1000));
                  const isExpired = diffHours <= 0;

                  return (
                    <div
                      key={g.id}
                      className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-sora font-bold text-sm text-on-surface">{g.name}</h4>
                          <span className="font-mono text-[10px] text-outline">({g.slug})</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isExpired
                                ? 'bg-error/20 text-error border border-error/40'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            }`}
                          >
                            {isExpired
                              ? `Expired ${Math.abs(diffHours)}h ago`
                              : `Expires in ${diffHours} hours`}
                          </span>
                        </div>
                        <p className="text-xs text-outline">
                          Owner: <span className="text-on-surface font-semibold">{g.ownerName}</span> · {g.ownerPhone || 'No phone'} · {g.ownerEmail}
                        </p>
                        <p className="text-[11px] text-outline">
                          Plan: <span className="text-secondary font-bold">{g.saasPlan}</span> · Expiry: {g.saasExpiresAt ? new Date(g.saasExpiresAt).toLocaleString('en-IN') : 'N/A'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenPrefilledReminder(g)}
                          className="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary hover:bg-secondary/90 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">notifications_active</span>
                          <span>Prefilled Reminder</span>
                        </button>

                        {g.ownerPhone && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppReminder(g)}
                            className="px-3 py-2 rounded-xl bg-[#25D366] text-white hover:bg-[#20ba59] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            title="Send WhatsApp Reminder"
                          >
                            <span className="material-symbols-outlined text-sm">chat</span>
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-surface-container-high bg-surface-container-low/40 flex items-center justify-between">
              <span className="text-[11px] text-outline">
                Tip: Click Prefilled Reminder to load preset reminder in the broadcast drawer.
              </span>
              <button
                type="button"
                onClick={() => setShowExpiring48hModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
