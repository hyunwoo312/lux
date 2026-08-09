import { describe, expect, it } from "vitest";
import {
  COOLDOWN_MS,
  DUPLICATE_WINDOW_MS,
  cooldownRemainingMs,
  isDuplicateSend,
  messageHash,
} from "@/feedback/useFeedbackStore";

const NOW = 1_800_000_000_000;

describe("cooldownRemainingMs", () => {
  it("is clear when nothing has been sent yet", () => {
    expect(cooldownRemainingMs(0, NOW)).toBe(0);
  });

  it("counts down from the last send and never goes negative", () => {
    expect(cooldownRemainingMs(NOW, NOW)).toBe(COOLDOWN_MS);
    expect(cooldownRemainingMs(NOW - COOLDOWN_MS / 2, NOW)).toBe(COOLDOWN_MS / 2);
    expect(cooldownRemainingMs(NOW - COOLDOWN_MS * 5, NOW)).toBe(0);
  });
});

describe("isDuplicateSend", () => {
  const message = "The sports widget shows the wrong score";
  const state = { lastSentHash: messageHash(message), lastSentAt: NOW };

  it("catches the same message resent inside the window", () => {
    expect(isDuplicateSend(state, message, NOW + 1000)).toBe(true);
  });

  it("ignores surrounding whitespace, which a re-paste often adds", () => {
    expect(isDuplicateSend(state, `  ${message}\n`, NOW + 1000)).toBe(true);
  });

  it("allows a different message immediately", () => {
    expect(isDuplicateSend(state, "A completely different report", NOW + 1000)).toBe(false);
  });

  it("allows the same message again once the window has passed", () => {
    expect(isDuplicateSend(state, message, NOW + DUPLICATE_WINDOW_MS + 1)).toBe(false);
  });

  it("never blocks the first send of a session", () => {
    expect(isDuplicateSend({ lastSentHash: "", lastSentAt: 0 }, message, NOW)).toBe(false);
  });
});
