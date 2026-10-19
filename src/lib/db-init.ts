/** Schema changes run with `npm run db:deploy`, not inside user requests.
 * Kept as a compatibility shim for existing action imports. */
export async function ensureDatabaseSchema(): Promise<void> {}
