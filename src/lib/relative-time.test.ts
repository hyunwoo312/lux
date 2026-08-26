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

  it("falls back to a date once relative stops being useful", () => {
    const old = formatRelativeTime(now - 400 * 86_400_000, now);
    expect(old).not.toMatch(/ago/);
    expect(old).toMatch(/2022/);
  });

  it("omits the year while the date is still in the current one", () => {
    const midYear = Date.parse("2024-08-01T12:00:00Z");

    expect(formatRelativeTime(midYear - 40 * 86_400_000, midYear)).not.toMatch(/\d{4}/);
  });
});
