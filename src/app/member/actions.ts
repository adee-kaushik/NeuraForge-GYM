'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePassword, memberEmail } from '@/lib/member-auth';
import { startOfDayIST } from '@/lib/format';
import { setMemberSession, clearMemberSession } from '@/lib/member-session';
import { getCurrentMember } from '@/lib/auth';

export type MemberLoginState = { error?: string; success?: boolean };

export async function loginMember(_prev: MemberLoginState, formData: FormData): Promise<MemberLoginState> {
  const gymCode = String(formData.get('gymCode') ?? '').trim().toLowerCase();
  const rawMemberId = String(formData.get('memberCode') ?? '').trim();

  if (!gymCode || !rawMemberId) {
    return { error: 'Enter your gym code and member ID (phone number).' };
  }

  // 1. Verify gym code exists and is unique to this gym
  const gym = await prisma.gym.findUnique({ where: { slug: gymCode } });
  if (!gym) {
    return { error: 'Invalid gym code. Please check your gym code with your gym front desk.' };
  }

  // 2. Member ID is phone number (clean last 10 digits) or memberCode
  const cleanDigits = rawMemberId.replace(/\D/g, '').slice(-10);
  const member = await prisma.member.findFirst({
    where: {
      gymId: gym.id,
      OR: [
        ...(cleanDigits ? [{ phone: { contains: cleanDigits } }] : []),
        { memberCode: rawMemberId.toUpperCase() },
      ],
    },
    include: { gym: true },
  });

  if (!member) {
    return { error: 'No member found with this ID or phone number in this gym. Verify your gym code and phone number.' };
  }

  // 3. Strict Gym isolation: verify member belongs to THIS specific gym
  if (member.gymId !== gym.id) {
    return { error: 'Access denied. You can only access your own gym with your gym code.' };
  }

  // 4. Activate member session (direct signed HTTP-only cookie, 30 days)
  await setMemberSession(member.id);

  return { success: true };
}

export type ResetPasswordResult = {
  ok: boolean;
  error?: string;
  phone?: string;
  memberName?: string;
  gymName?: string;
  gymCode?: string;
  password?: string;
  whatsappUrl?: string;
  smsUrl?: string;
  messageText?: string;
};

// Member self-service password reset: sends new password to their WhatsApp / phone message
export async function resetMemberPasswordByPhone(gymCodeRaw: string, phoneOrIdRaw: string): Promise<ResetPasswordResult> {
  const gymCode = gymCodeRaw.trim().toLowerCase();
  const rawId = phoneOrIdRaw.trim();

  if (!gymCode || !rawId) {
    return { ok: false, error: 'Please enter your Gym Code and Phone Number.' };
  }

  // 1. Find Gym
  const gym = await prisma.gym.findUnique({ where: { slug: gymCode } });
  if (!gym) {
    return { ok: false, error: 'Invalid Gym Code. Please check the code provided by your gym.' };
  }

  // 2. Find Member strictly within this gym by phone number or code
  const cleanPhone = rawId.replace(/\D/g, '').slice(-10);
  const member = await prisma.member.findFirst({
    where: {
      gymId: gym.id,
      OR: [
        ...(cleanPhone ? [{ phone: { contains: cleanPhone } }] : []),
        { memberCode: rawId.toUpperCase() },
      ],
    },
  });

  if (!member) {
    return { ok: false, error: 'No member found with this phone number in this gym. Verify your gym code and phone.' };
  }

  const password = generatePassword();
  const admin = createAdminClient();
  const loginIdentifier = cleanPhone || member.memberCode;

  if (member.authUserId) {
    // Member has existing login -> update password
    const { error } = await admin.auth.admin.updateUserById(member.authUserId, { password });
    if (error) {
      return { ok: false, error: 'Could not reset password. Please contact gym reception.' };
    }
  } else {
    // Member was enrolled by gym but had no login yet -> create login
    const { data, error } = await admin.auth.admin.createUser({
      email: memberEmail(gym.slug, loginIdentifier),
      password,
      email_confirm: true,
      app_metadata: { role: 'MEMBER', gym_id: gym.id, member_id: member.id },
    });
    if (error || !data.user) {
      return { ok: false, error: 'Could not generate login credentials. Please try again.' };
    }
    await prisma.member.update({ where: { id: member.id }, data: { authUserId: data.user.id } });
  }

  const digits = member.phone.replace(/\D/g, '');
  const waPhone = digits.length === 10 ? `91${digits}` : digits;
  const messageText = `Hi ${member.name}, your login credentials for ${gym.name}:\nGym Code: ${gym.slug}\nMember ID (Phone): ${cleanPhone || digits.slice(-10)}\nPassword: ${password}\nLogin portal: https://neuraforge.com/member/login`;
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(waPhone)}&text=${encodeURIComponent(messageText)}`;
  const smsUrl = `sms:${digits}?body=${encodeURIComponent(messageText)}`;

  return {
    ok: true,
    memberName: member.name,
    phone: member.phone,
    gymName: gym.name,
    gymCode: gym.slug,
    password,
    whatsappUrl,
    smsUrl,
    messageText,
  };
}

export async function logoutMember() {
  await clearMemberSession();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/member/login');
}

export async function memberSelfCheckIn(): Promise<{ ok: boolean; error?: string }> {
  const member = await getCurrentMember();
  if (!member) return { ok: false, error: 'Please log in first.' };

  const now = new Date();
  const latestMembership = await prisma.membership.findFirst({
    where: { memberId: member.id, gymId: member.gymId },
    orderBy: { expiresAt: 'desc' },
  });

  if (!latestMembership || latestMembership.expiresAt < now) {
    return { ok: false, error: 'Your membership has expired. Please renew with the front desk.' };
  }

  const alreadyIn = await prisma.attendance.findFirst({
    where: {
      gymId: member.gymId,
      memberId: member.id,
      checkedInAt: { gte: startOfDayIST(now) },
    },
  });

  if (alreadyIn) {
    return { ok: false, error: 'You have already checked in today.' };
  }

  await prisma.attendance.create({
    data: {
      gymId: member.gymId,
      memberId: member.id,
      checkedInAt: now,
    },
  });

  return { ok: true };
}
