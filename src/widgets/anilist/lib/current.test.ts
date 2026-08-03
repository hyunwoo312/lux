import { describe, expect, it } from "vitest";
import {
  computeBehind,
  formatAiringIn,
  formatScore,
  groupByAiringDay,
  progressLabel,
  sortCurrentEntries,
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

describe("formatScore", () => {
  it("shows an integer for the 100-point scale", () => {
    expect(formatScore(85, "POINT_100")).toBe("85");
  });

  it("shows one decimal for the decimal 10-point scale", () => {
    expect(formatScore(8.5, "POINT_10_DECIMAL")).toBe("8.5");
  });

  it("shows an integer for the 10-point scale", () => {
    expect(formatScore(8, "POINT_10")).toBe("8");
  });

  it("appends a star for the 5-point scale", () => {
    expect(formatScore(3, "POINT_5")).toBe("3★");
  });

  it("maps the 3-point scale to faces", () => {
    expect(formatScore(1, "POINT_3")).toBe("🙁");
    expect(formatScore(2, "POINT_3")).toBe("😐");
    expect(formatScore(3, "POINT_3")).toBe("🙂");
  });

  it("renders nothing for an unrated entry", () => {
    expect(formatScore(0, "POINT_10")).toBeNull();
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

describe("airing sort and grouping", () => {
  const DAY = 86_400;
  const now = new Date("2026-08-04T12:00:00").getTime();
  const at = (offsetSeconds: number) => Math.floor(now / 1000) + offsetSeconds;

  const airing = (id: number, offsetSeconds: number | null): CurrentEntry => ({
    id,
    kind: "anime",
    title: `Show ${id}`,
    siteUrl: `https://anilist.co/anime/${id}`,
    progress: 1,
    total: 12,
    behind: 0,
    ...(offsetSeconds === null
      ? {}
      : { nextEpisode: { episode: 2, airingAt: at(offsetSeconds) } }),
  });

  it("orders by soonest airing and pushes entries with no next episode last", () => {
    const sorted = sortCurrentEntries(
      [airing(1, 3 * 3600), airing(2, null), airing(3, 600)],
      "airing",
    );
    expect(sorted.map((entry) => entry.id)).toEqual([3, 1, 2]);
  });

  it("labels today and tomorrow, and falls back to a weekday after that", () => {
    const groups = groupByAiringDay([airing(1, 3600), airing(2, DAY), airing(3, 3 * DAY)], now);

    expect(groups[0]?.label).toBe("Today");
    expect(groups[1]?.label).toBe("Tomorrow");
    expect(groups[2]?.label).not.toBe("Tomorrow");
    expect(groups[2]?.label).toMatch(/^\w+$/);
  });

  it("skips entries with no next episode entirely", () => {
    const groups = groupByAiringDay([airing(1, null), airing(2, 3600)], now);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.entries.map((entry) => entry.id)).toEqual([2]);
  });

  it("returns no groups when nothing is airing", () => {
    expect(groupByAiringDay([airing(1, null)], now)).toEqual([]);
  });
});
