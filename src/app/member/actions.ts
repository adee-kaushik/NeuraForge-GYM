'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { memberEmail } from '@/lib/member-auth';

export type MemberLoginState = { error?: string };

export async function loginMember(_prev: MemberLoginState, formData: FormData): Promise<MemberLoginState> {
  const gymCode = String(formData.get('gymCode') ?? '').trim().toLowerCase();
  const memberCode = String(formData.get('memberCode') ?? '').trim().toUpperCase();
  const password = String(formData.get('password') ?? '');

  if (!gymCode || !memberCode || !password) return { error: 'Enter your gym code, member ID and password.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: memberEmail(gymCode, memberCode),
    password,
  });
  if (error || !data.user) return { error: 'Wrong gym code, member ID or password.' };

  // Only member accounts may use this page (owners and staff log in on /login)
  const member = await prisma.member.findUnique({ where: { authUserId: data.user.id } });
  if (!member) {
    await supabase.auth.signOut();
    return { error: 'This is not a member account.' };
  }

  redirect('/member');
}

export async function logoutMember() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/member/login');
}
