import { describe, expect, it } from "vitest";
import {
  CALENDAR_SYNC_COOLDOWN_MS,
  getCalendarSyncCooldownMessage,
  isCalendarSyncCoolingDown,
} from "@/widgets/calendar/lib/cooldown";

const NOW = 1_700_000_000_000;

describe("calendar sync cooldown", () => {
  it("is not cooling down without a last sync or once the window has elapsed", () => {
    expect(isCalendarSyncCoolingDown(undefined, NOW)).toBe(false);
    expect(getCalendarSyncCooldownMessage(undefined, NOW)).toBe("");
    expect(
      isCalendarSyncCoolingDown(new Date(NOW - CALENDAR_SYNC_COOLDOWN_MS).toISOString(), NOW),
    ).toBe(false);
  });

  it("is cooling down immediately after a sync", () => {
    const lastSyncedAt = new Date(NOW).toISOString();
    expect(isCalendarSyncCoolingDown(lastSyncedAt, NOW)).toBe(true);
    expect(getCalendarSyncCooldownMessage(lastSyncedAt, NOW)).toMatch(/Sync again in 60s/);
  });

  it("counts down the remaining seconds", () => {
    const lastSyncedAt = new Date(NOW - 45_000).toISOString();
    expect(getCalendarSyncCooldownMessage(lastSyncedAt, NOW)).toBe("Sync again in 15s");
  });
});
