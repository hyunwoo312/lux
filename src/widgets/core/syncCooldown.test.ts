import { describe, expect, it } from "vitest";
import { syncCooldownMessage, syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";

const NOW = 1_700_000_000_000;
const COOLDOWN_MS = 60_000;

describe("sync cooldown", () => {
  it("is over before it starts without a stamp, and once the window has elapsed", () => {
    expect(syncCooldownRemainingMs(undefined, COOLDOWN_MS, NOW)).toBe(0);
    expect(syncCooldownRemainingMs(NOW - COOLDOWN_MS, COOLDOWN_MS, NOW)).toBe(0);
    expect(syncCooldownMessage(0)).toBe("");
  });

  it("counts the remaining seconds up to a whole second", () => {
    expect(syncCooldownMessage(syncCooldownRemainingMs(NOW - 44_100, COOLDOWN_MS, NOW))).toBe(
      "Sync again in 16s",
    );
  });
});
