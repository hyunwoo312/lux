// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sourceFiles, sourcePath } from "@/test/source-files";
import { searchSettings, settingsIndex } from "@/settings/searchIndex";
import { SETTINGS_TABS } from "@/stores/settingsTabs";

const HAND_WRITTEN = /<Config(?:Row|SubRow|Section)\b[^>]*?\s(?:title|description)="/s;

describe("settings search", () => {
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
