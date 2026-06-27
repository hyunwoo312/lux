import { describe, expect, it } from "vitest";
import {
  computeBehind,
  formatAiringIn,
  progressLabel,
  sumWaiting,
} from "@/widgets/anilist/lib/current";
import type { CurrentEntry } from "@/widgets/anilist/types";

function entry(overrides: Partial<CurrentEntry>): CurrentEntry {
  return {
    id: 1,
    kind: "anime",
    title: "Show",
    siteUrl: "https://anilist.co/anime/1",
    progress: 0,
    total: null,
    behind: null,
    ...overrides,
  };
}

describe("computeBehind", () => {
  it("derives airing anime backlog from the next airing episode", () => {
    expect(computeBehind("anime", 5, 24, 9)).toBe(3);
  });

  it("uses the total episode count for finished anime", () => {
    expect(computeBehind("anime", 10, 12, null)).toBe(2);
  });

  it("never reports a negative backlog", () => {
    expect(computeBehind("anime", 12, 12, null)).toBe(0);
  });

  it("returns null when the manga chapter count is unknown", () => {
    expect(computeBehind("manga", 30, null, null)).toBeNull();
  });

  it("counts unread manga chapters when known", () => {
    expect(computeBehind("manga", 30, 45, null)).toBe(15);
  });
});

describe("sumWaiting", () => {
  it("splits the backlog into episodes and chapters", () => {
    const entries = [
      entry({ kind: "anime", behind: 3 }),
      entry({ kind: "anime", behind: 0 }),
      entry({ kind: "manga", behind: 5 }),
      entry({ kind: "manga", behind: null }),
    ];
    expect(sumWaiting(entries)).toEqual({ episodes: 3, chapters: 5 });
  });
});

describe("progressLabel", () => {
  it("shows a known total", () => {
    expect(progressLabel(entry({ kind: "anime", progress: 5, total: 12 }))).toBe("Ep 5/12");
  });

  it("shows a question mark when the total is unknown", () => {
    expect(progressLabel(entry({ kind: "manga", progress: 30, total: null }))).toBe("Ch 30/?");
  });
});

describe("formatAiringIn", () => {
  const now = 1_000_000_000_000;

  it("rounds down to whole days", () => {
    expect(formatAiringIn(Math.floor(now / 1000) + 2 * 86_400 + 100, now)).toBe("2d");
  });

  it("falls back to hours then minutes", () => {
    expect(formatAiringIn(Math.floor(now / 1000) + 5 * 3_600, now)).toBe("5h");
    expect(formatAiringIn(Math.floor(now / 1000) + 90, now)).toBe("1m");
  });

  it("reports now once the air time has passed", () => {
    expect(formatAiringIn(Math.floor(now / 1000) - 10, now)).toBe("now");
  });
});
