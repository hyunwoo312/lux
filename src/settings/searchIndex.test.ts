// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sourceFiles, sourcePath } from "@/test/source-files";
import { searchSettings, settingsIndex } from "@/settings/searchIndex";
import { SETTINGS_TABS } from "@/stores/settingsTabs";
import { DASHBOARD, PALETTE_SUGGESTIONS, REFRESH, WALLPAPER } from "@/settings/rows";
import { widgetPlugins } from "@/widgets/registry";

const HAND_WRITTEN = /<Config(?:Row|SubRow|Section)\b[^>]*?\s(?:title|description)="/s;

describe("settings search", () => {
  it("ranks the exact field before section or description matches", () => {
    expect(searchSettings("Grid lines")[0]?.settingId).toBe(DASHBOARD.rows.gridLines.settingId);
  });
  it("has unique stable destinations for every result", () => {
    const ids = settingsIndex().map((entry) => entry.settingId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^settings\.[a-z]+\.[\w.-]+$/.test(id))).toBe(true);
  });

  it("indexes only widget refresh controls that actually exist", () => {
    const rows = settingsIndex().filter(
      (entry) =>
        entry.settingId.startsWith(`${REFRESH.settingId}.`) &&
        entry.settingId !== REFRESH.rows.cadence.settingId,
    );
    expect(rows.map((entry) => entry.settingId)).toEqual(
      widgetPlugins
        .filter((plugin) => plugin.refreshMs !== undefined)
        .map((plugin) => `${REFRESH.settingId}.${plugin.type}`),
    );
    expect(
      searchSettings("Stocks refresh").some(
        (entry) => entry.settingId === `${REFRESH.settingId}.stocks`,
      ),
    ).toBe(false);
  });

  it("routes conditional results to their controllers without changing preferences", () => {
    const entry = (id: string) => settingsIndex().find((item) => item.settingId === id);
    expect(entry(WALLPAPER.rows.interval.settingId)?.fallbackIds).toEqual([
      WALLPAPER.rows.timer.settingId,
      WALLPAPER.rows.mode.settingId,
      WALLPAPER.rows.type.settingId,
      WALLPAPER.settingId,
    ]);
    expect(entry(WALLPAPER.rows.speed.settingId)?.hint).toContain("Aurora");
    expect(entry(PALETTE_SUGGESTIONS.rows.count.settingId)?.fallbackIds?.[0]).toBe(
      PALETTE_SUGGESTIONS.rows.suggested.settingId,
    );
    expect(entry(DASHBOARD.rows.clockDate.settingId)?.fallbackIds?.[0]).toBe(
      DASHBOARD.rows.clock.settingId,
    );
  });
  it("draws every row and section from the shared copy, so the index cannot drift", () => {
    const settings = sourceFiles().filter((file) => sourcePath(file).startsWith("settings/"));
    const rows = settings.flatMap(
      (file) => readFileSync(file, "utf8").match(/<Config(?:Row|SubRow|Section)\b/g) ?? [],
    );
    const handWritten = settings.filter((file) => HAND_WRITTEN.test(readFileSync(file, "utf8")));

    expect(rows.length).toBeGreaterThan(30);
    expect(handWritten.map(sourcePath)).toEqual([]);
  });

  it("covers every tab, so no tab is unreachable by search", () => {
    const covered = new Set(settingsIndex().map((entry) => entry.tab));
    expect([...SETTINGS_TABS].filter((tab) => !covered.has(tab))).toEqual([]);
  });

  it("finds a setting by a word that only appears in its description", () => {
    expect(searchSettings("AM/PM").map((entry) => entry.label)).toContain("24-hour time");
    expect(searchSettings("read-only").map((entry) => entry.tab)).toContain("accounts");
  });

  it("returns nothing for an empty query rather than everything", () => {
    expect(searchSettings("   ")).toEqual([]);
  });
});
