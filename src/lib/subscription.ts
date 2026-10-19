type Subscription = { isSuspended?: boolean; saasStatus?: string; saasExpiresAt?: Date | string | null };
export function subscriptionActive(gym: Subscription, now = new Date()): boolean {
  if (gym.isSuspended || !['ACTIVE', 'TRIAL'].includes(gym.saasStatus || '')) return false;
  return !gym.saasExpiresAt || new Date(gym.saasExpiresAt).getTime() > now.getTime();
}
