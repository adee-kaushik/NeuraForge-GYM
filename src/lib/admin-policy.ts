type AdminIdentity = { app_metadata?: Record<string, unknown> };
// Public signup auto-confirms emails, so email addresses alone must never confer privileges.
export function hasAdminAccess(user: AdminIdentity | null | undefined): boolean {
  return user?.app_metadata?.neurafitness_admin === true || user?.app_metadata?.neuraforge_admin === true;
}
