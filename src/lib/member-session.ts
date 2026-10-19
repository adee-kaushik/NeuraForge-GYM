import { cookies } from 'next/headers';

// Retired: the old phone-only session must never grant access again.
export async function clearMemberSession(): Promise<void> {
  const store = await cookies();
  store.delete('nf_member_session');
}
