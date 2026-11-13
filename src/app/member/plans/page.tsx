import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MemberNav } from '@/components/member/MemberNav';
import { MemberWellness } from '@/components/member/MemberWellness';
import type { WellnessResult } from '@/lib/wellness';
export const dynamic = 'force-dynamic';
export default async function MemberPlansPage(){
  const member=await getCurrentMember();if(!member)redirect('/member/login');
  const [assigned,saved]=await Promise.all([
    prisma.gymReminder.findMany({where:{gymId:member.gymId,memberId:member.id,type:{in:['WORKOUT_PLAN','DIET_PLAN']}},orderBy:{createdAt:'desc'},take:50}),
    prisma.gymReminder.findFirst({where:{gymId:member.gymId,memberId:member.id,type:'SELF_PLANS'},orderBy:{createdAt:'desc'}})
  ]);
  let initialResult:WellnessResult|null=null;
  if(saved){try{const parsed=JSON.parse(saved.message);if(parsed.version===1 && Array.isArray(parsed.workouts) && Array.isArray(parsed.diets))initialResult=parsed;}catch{/* Older/incomplete snapshots can be regenerated. */}}
  return <main className="min-h-screen px-4 py-6"><div className="max-w-3xl mx-auto space-y-6"><header><p className="text-sm text-outline">{member.gym.name}</p><h1 className="font-sora text-2xl font-bold">Workout & Diet</h1></header><MemberNav/>
    <section className="space-y-3"><h2 className="font-sora text-lg font-semibold">Sent by your gym</h2>{assigned.length?assigned.map(p=><details key={p.id} className="rounded-2xl bg-white p-4 border border-surface-container-high"><summary className="font-semibold cursor-pointer">{p.type==='WORKOUT_PLAN'?'Workout':'Diet'} · {p.title}<p className="text-xs text-outline mt-1">{p.createdAt.toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</p></summary><p className="whitespace-pre-wrap text-sm leading-relaxed mt-4">{p.message}</p></details>):<p className="text-sm text-outline">Your trainer’s assigned plans will appear here. You can also create personal options below.</p>}</section>
    <MemberWellness initialResult={initialResult}/></div></main>;
}
