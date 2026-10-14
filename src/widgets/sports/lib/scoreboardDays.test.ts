import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { fetchScoreboardWindow, scoreboardDays } from "@/widgets/sports/lib/scoreboardDays";

beforeEach(() => {
  clearPolledResources();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("shared scoreboard days", () => {
  it("labels retained daily data as incomplete when a refresh fails", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        async () => new Response(JSON.stringify({ events: [] }), { status: 200 }),
      );
    await fetchScoreboardWindow("basketball/nba", "20261013-20261013");
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 16 * 60_000);
    fetch.mockImplementation(async () => new Response("unavailable", { status: 503 }));
    const result = await fetchScoreboardWindow("basketball/nba", "20261013-20261013");
    expect(result.missingDays).toEqual(["20261012", "20261013", "20261014"]);
  });
  it("pads local dates across a year boundary", () => {
    expect(scoreboardDays("20261231-20270101")).toEqual([
      "20261230",
      "20261231",
      "20270101",
      "20270102",
    ]);
  });
  it("reuses overlapping daily reads instead of fetching the same dates for another range", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        async () => new Response(JSON.stringify({ events: [] }), { status: 200 }),
      );
    await fetchScoreboardWindow("basketball/nba", "20261013-20261013");
    await fetchScoreboardWindow("basketball/nba", "20261012-20261014");
    expect(fetch).toHaveBeenCalledTimes(5);
    const dates = fetch.mock.calls.map(([url]) => new URL(String(url)).searchParams.get("dates"));
    expect(new Set(dates).size).toBe(5);
  });
  it("reports partial date coverage and fails when every page is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("dates=20261013")
        ? new Response("unavailable", { status: 503 })
        : new Response(JSON.stringify({ events: [] }), { status: 200 }),
    );
    expect(await fetchScoreboardWindow("basketball/nba", "20261013-20261013")).toEqual({
      matches: [],
      missingDays: ["20261013"],
    });
    vi.mocked(fetch).mockImplementation(async () => new Response("unavailable", { status: 503 }));
    await expect(fetchScoreboardWindow("football/nfl", "20261013-20261013")).rejects.toThrow(
      "Scores are unavailable",
    );
  });
});
