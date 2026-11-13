'use client';
import React from 'react';
import { Users, UserPlus, CreditCard, Dumbbell, Pill, Gauge, Wallet, MessageSquare, Settings, Bell, QrCode, ClipboardCheck, Upload, Fingerprint, TrendingUp, CalendarClock } from 'lucide-react';
import type { Member, Transaction, CheckInLog, ActiveScreen, EnrollmentRecord } from '../types';
import type { DashboardStats } from '../lib/stats';
import { inr } from '../lib/format';
import { GymBanner } from './GymBanner';
import type { GymConfig } from '../config/gym';

interface DashboardViewProps {
  gym: GymConfig; isStaff?: boolean; onGymUpdate?: (updatedGym: GymConfig) => void;
  stats: DashboardStats; members: Member[]; transactions: Transaction[]; checkIns: CheckInLog[];
  onOpenBulkWhatsApp: (tab?: 'renewal' | 'announcement') => void;
  onViewAllExpiring: () => void; onSelectMember: (member: Member) => void;
  onSendSingleReminder: (member: Member) => void; onOpenAddMember?: () => void;
  onOpenImport?: () => void; onNavigateScreen?: (screen: ActiveScreen) => void;
  pendingEnrollments?: EnrollmentRecord[]; onOpenPendingEnrollments?: () => void; onOpenFrontDeskQr?: () => void;
}
export const DashboardView: React.FC<DashboardViewProps> = ({ gym,isStaff=false,onGymUpdate,stats,onNavigateScreen,onOpenBulkWhatsApp,onOpenAddMember,onOpenImport,onViewAllExpiring,pendingEnrollments=[],onOpenPendingEnrollments,onOpenFrontDeskQr }) => {
  const go = (screen:ActiveScreen) => () => onNavigateScreen?.(screen);
  const tiles = [
    {name:'Members',icon:Users,detail:`${stats.totalMembers} total · ${stats.activeMembers} active`,onClick:go('members')},
    {name:'Memberships',icon:CreditCard,detail:'Plans & pricing',onClick:go('memberships')},
    {name:'Attendance',icon:Fingerprint,detail:`${stats.todayEntries} visits today`,onClick:go('attendance')},
    {name:'Workout & Diet',icon:Dumbbell,detail:'Create & send plans',onClick:go('workout-plans')},
    {name:'Supplements',icon:Pill,detail:'Stock & sales',onClick:go('supplements')},
    {name:'Live Floor',icon:Gauge,detail:'Gym activity',onClick:go('floor-velocity')},
    {name:'Renewals',icon:CalendarClock,detail:`${stats.expiringThisWeek} expiring soon`,onClick:onViewAllExpiring},
    {name:'Send Reminder',icon:Bell,detail:'Deliver to member panels',onClick:()=>onOpenBulkWhatsApp('renewal')},
    {name:'Announcement',icon:MessageSquare,detail:'Message your members',onClick:()=>onOpenBulkWhatsApp('announcement')},
    ...(!isStaff ? [
      {name:'Payments',icon:Wallet,detail:`${inr(stats.pendingAmount)} pending`,onClick:go('payments')},
      {name:'Enquiries',icon:ClipboardCheck,detail:'Follow up with prospects',onClick:go('enquiries')},
      {name:'Gym Settings',icon:Settings,detail:'Profile & preferences',onClick:go('settings')},
    ] : []),
  ];
  const percent=Math.max(0,Math.min(100,stats.goalPercent));
  const stage=percent>=100?{color:'#047857',label:'Goal reached'}:percent>=75?{color:'#0f766e',label:'Final stretch'}:percent>=50?{color:'#0369a1',label:'Halfway there'}:percent>=25?{color:'#a16207',label:'Building momentum'}:{color:'#57534e',label:'Getting started'};
  return <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
    <GymBanner gym={gym} onGymUpdate={onGymUpdate} canEdit={!isStaff}/>
    <section aria-label={`${gym.name} dashboard`}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-outline mb-1">{isStaff?'Staff workspace':'Owner workspace'}</p><h1 className="font-sora text-2xl font-bold">{gym.name}</h1><p className="text-sm text-outline mt-1">Everything for your gym, one tap away.</p></div><span className="text-xs rounded-full px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200">{stats.activeMembers} active members</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">{tiles.map(({name,icon:Icon,detail,onClick})=><button key={name} type="button" className="nf-tile text-center" onClick={onClick}><span className="rounded-2xl bg-secondary-container p-3 text-sky-800"><Icon size={26} strokeWidth={1.7} aria-hidden="true"/></span><span className="text-sm font-bold">{name}</span><span className="text-xs font-normal text-on-surface-variant">{detail}</span></button>)}</div>
    </section>
    <section aria-label="Quick actions" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[{name:'Add Member',icon:UserPlus,action:onOpenAddMember},{name:'Front Desk QR',icon:QrCode,action:onOpenFrontDeskQr},{name:`Approvals (${pendingEnrollments.length})`,icon:ClipboardCheck,action:onOpenPendingEnrollments},{name:'Import Members',icon:Upload,action:onOpenImport}].map(({name,icon:Icon,action})=><button key={name} className="nf-tile" onClick={action} disabled={!action}><Icon size={23} aria-hidden="true"/><span>{name}</span></button>)}
    </section>
    {!isStaff && <section className="rounded-2xl bg-white border border-surface-container-high p-5 sm:p-6 space-y-4" aria-label="Monthly revenue goal">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><TrendingUp size={24} style={{color:stage.color}} aria-hidden="true"/><div><h2 className="font-sora font-semibold">Monthly Revenue Goal</h2><p className="text-xs text-outline">{stats.daysLeftInMonth} days left this month</p></div></div><p className="text-sm"><strong>{inr(stats.revenueThisMonth)}</strong> / {inr(stats.goal)}</p></div>
      <div className="h-3 rounded-full bg-stone-100 overflow-hidden" role="progressbar" aria-label="Monthly revenue goal" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full transition-[width,background-color] duration-300" style={{width:`${percent}%`,backgroundColor:stage.color}}/></div>
      <div className="flex flex-wrap justify-between gap-2 text-sm"><strong style={{color:stage.color}}>{percent}% · {stats.goal>0?stage.label:'Set a goal in Gym Settings'}</strong><span className="text-outline">{stats.remainingToGoal>0?`${inr(stats.remainingToGoal)} to go`:'Keep up the progress'}</span></div>
      <p className="text-xs text-outline">Milestones: 25% amber · 50% blue · 75% teal · 100% green</p>
    </section>}
  </div>;
};
