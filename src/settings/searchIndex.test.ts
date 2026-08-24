// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { searchSettings, settingsIndex } from "@/settings/searchIndex";
import { SETTINGS_TABS } from "@/settings/tabsMeta";
import { widgetPlugins } from "@/widgets/registry";

describe("settings search", () => {
  it("only ever points at a tab that exists", () => {
    for (const entry of settingsIndex()) {
      expect(SETTINGS_TABS).toContain(entry.tab);
    }
  });

  it("covers every tab, so no tab is unreachable by search", () => {
    const covered = new Set(settingsIndex().map((entry) => entry.tab));
    expect([...SETTINGS_TABS].filter((tab) => !covered.has(tab))).toEqual([]);
  });

  it("grows with the widget registry rather than needing a hand edit", () => {
    const listed = settingsIndex().filter((entry) => entry.tab === "widgets");
    expect(listed).toHaveLength(widgetPlugins.length);
  });

  it("finds a setting by a word that only appears in its description", () => {
    expect(searchSettings("AM/PM").map((entry) => entry.label)).toContain("24-hour time");
    expect(searchSettings("read-only").map((entry) => entry.tab)).toContain("accounts");
  });

  it("returns nothing for an empty query rather than everything", () => {
    expect(searchSettings("   ")).toEqual([]);
  });
});
