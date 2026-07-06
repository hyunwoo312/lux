import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/relative-time";

describe("formatRelativeTime", () => {
  const now = Date.parse("2024-01-01T12:00:00Z");

  it("formats minutes, hours, days, and weeks", () => {
    expect(formatRelativeTime(new Date(now).toISOString(), now)).toBe("just now");
    expect(formatRelativeTime(new Date(now - 5 * 60_000).toISOString(), now)).toBe("5m ago");
    expect(formatRelativeTime(new Date(now - 3 * 3_600_000).toISOString(), now)).toBe("3h ago");
    expect(formatRelativeTime(new Date(now - 2 * 86_400_000).toISOString(), now)).toBe("2d ago");
    expect(formatRelativeTime(new Date(now - 14 * 86_400_000).toISOString(), now)).toBe("2w ago");
  });

  it("accepts epoch milliseconds as well as ISO strings", () => {
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5m ago");
    expect(formatRelativeTime(now, now)).toBe("just now");
  });
});
