import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MemberNav } from '@/components/member/MemberNav';
export const dynamic = 'force-dynamic';
export default async function Messages({searchParams}:{searchParams:Promise<{page?:string}>}) {
 const member=await getCurrentMember();if(!member)redirect('/member/login');
 const raw=Number((await searchParams).page||1);const page=Number.isSafeInteger(raw)&&raw>0?Math.min(raw,10000):1;
 const rows=await prisma.gymReminder.findMany({where:{gymId:member.gymId,type:{not:'SELF_PLANS'},OR:[{memberId:member.id},{memberId:null}]},orderBy:[{createdAt:'desc'},{id:'desc'}],take:21,skip:(page-1)*20});
 return <main className="min-h-screen p-4 py-6"><div className="max-w-2xl mx-auto space-y-5"><h1 className="font-sora text-2xl font-bold">Messages from {member.gym.name}</h1><MemberNav/>{!rows.length&&<p>No messages yet.</p>}{rows.slice(0,20).map(r=><article key={r.id} className="bg-white border border-surface-container-high rounded-xl p-4"><h2 className="font-bold">{r.title}</h2><p className="text-xs text-outline my-2">{r.createdAt.toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p><p className="text-sm whitespace-pre-wrap">{r.message}</p></article>)}<div className="flex justify-between">{page>1?<Link href={`/member/messages?page=${page-1}`}>Newer messages</Link>:<span/>}{rows.length>20&&<Link href={`/member/messages?page=${page+1}`}>Older messages</Link>}</div></div></main>;
}
