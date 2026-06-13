import { syncCooldownMessage, syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";

export const CALENDAR_SYNC_COOLDOWN_MS = 60_000;

function toEpochMs(lastSyncedAt: string | undefined): number | undefined {
  if (!lastSyncedAt) return undefined;
  const time = new Date(lastSyncedAt).getTime();
  return Number.isFinite(time) ? time : undefined;
}

function getCalendarSyncCooldownRemainingMs(
  lastSyncedAt: string | undefined,
  now = Date.now(),
): number {
  return syncCooldownRemainingMs(toEpochMs(lastSyncedAt), CALENDAR_SYNC_COOLDOWN_MS, now);
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
  return syncCooldownMessage(getCalendarSyncCooldownRemainingMs(lastSyncedAt, now));
}
