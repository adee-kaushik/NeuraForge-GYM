'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export type LoginState = { error?: string };

export async function loginOwner(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'Wrong email or password.' };

  // Only owner/staff accounts may use this dashboard (members are handled separately)
  const staff = await prisma.user.findUnique({ where: { authUserId: data.user.id } });
  if (!staff) {
    await supabase.auth.signOut();
    return { error: 'This account is not an owner or staff account.' };
  }

  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}