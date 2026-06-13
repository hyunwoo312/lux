export function syncCooldownRemainingMs(
  lastSyncAt: number | undefined,
  cooldownMs: number,
  now = Date.now(),
): number {
  if (lastSyncAt === undefined || !Number.isFinite(lastSyncAt)) return 0;
  return Math.max(0, cooldownMs - (now - lastSyncAt));
}

export function syncCooldownMessage(remainingMs: number): string {
  if (remainingMs <= 0) return "";
  return `Sync again in ${Math.ceil(remainingMs / 1000)}s`;
}
