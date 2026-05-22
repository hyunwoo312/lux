export const CALENDAR_SYNC_COOLDOWN_MS = 60_000;

function getCalendarSyncCooldownRemainingMs(
  lastSyncedAt: string | undefined,
  now = Date.now(),
): number {
  if (!lastSyncedAt) return 0;

  const lastSyncedTime = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(lastSyncedTime)) return 0;

  return Math.max(0, CALENDAR_SYNC_COOLDOWN_MS - (now - lastSyncedTime));
}

export function isCalendarSyncCoolingDown(
  lastSyncedAt: string | undefined,
  now = Date.now(),
): boolean {
  return getCalendarSyncCooldownRemainingMs(lastSyncedAt, now) > 0;
}

export function getCalendarSyncCooldownMessage(
  lastSyncedAt: string | undefined,
  now = Date.now(),
): string {
  const remainingMs = getCalendarSyncCooldownRemainingMs(lastSyncedAt, now);
  if (remainingMs <= 0) return "";
  return `Sync again in ${Math.ceil(remainingMs / 1000)}s`;
}
