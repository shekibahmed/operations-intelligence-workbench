/** Minutes remaining until a guest Workspace's TTL expiry (UX_SPEC §1.2 session indicator), floored at zero. */
export function minutesRemaining(expiresAt: string | null, now: Date = new Date()): number {
  if (expiresAt === null) return 0;
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return Math.max(0, Math.round(ms / 60_000));
}
