'use server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildWellnessPlans, validateProfile, type WellnessProfile, type WellnessResult } from '@/lib/wellness';
import { revalidatePath } from 'next/cache';

export async function generateMemberPlans(profile: WellnessProfile): Promise<{ok: boolean; result?: WellnessResult; error?: string}> {
  const member = await getCurrentMember();
  if (!member) return {ok:false,error:'Please sign in again.'};
  const error = validateProfile(profile);
  if (error) return {ok:false,error};
  try {
    // The existing scoped inbox stores delivered plan snapshots. Do not persist raw health answers.
    const result = await prisma.$transaction(async tx => {
      const previous = await tx.gymReminder.findFirst({where:{gymId:member.gymId,memberId:member.id,type:'SELF_PLANS'},orderBy:{createdAt:'desc'}});
      let variant = 0;
      if(previous) { try { variant = ((JSON.parse(previous.message).variant || 0) + 1) % 3; } catch { variant = 1; } }
      const result = buildWellnessPlans(profile, variant);
      await tx.gymReminder.deleteMany({where:{gymId:member.gymId,memberId:member.id,type:'SELF_PLANS'}});
      await tx.gymReminder.create({data:{gymId:member.gymId,memberId:member.id,type:'SELF_PLANS',title:'My workout & diet options',message:JSON.stringify(result)}});
      return result;
    });
    revalidatePath('/member/plans');
    return {ok:true,result};
  } catch { return {ok:false,error:'Could not save your plans. Please try again.'}; }
}

export async function deleteMemberPlans(): Promise<{ok:boolean;error?:string}> {
  const member = await getCurrentMember();
  if (!member) return {ok:false,error:'Please sign in again.'};
  try {
    await prisma.gymReminder.deleteMany({where:{gymId:member.gymId,memberId:member.id,type:'SELF_PLANS'}});
    revalidatePath('/member/plans');
    return {ok:true};
  } catch { return {ok:false,error:'Could not delete your plans. Please retry.'}; }
}
