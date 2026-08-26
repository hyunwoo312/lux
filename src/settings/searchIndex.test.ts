// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sourceFiles, sourcePath } from "@/test/source-files";
import { searchSettings, settingsIndex } from "@/settings/searchIndex";
import { SETTINGS_TABS } from "@/settings/tabsMeta";

const SETTINGS_ROW = /<SettingsRow\b[^>]*?\stitle="([^"]+)"/gs;

function writtenRows(): { title: string; file: string }[] {
  return sourceFiles()
    .filter((file) => sourcePath(file).startsWith("settings/"))
    .flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(SETTINGS_ROW)].map((match) => ({
        title: match[1] ?? "",
        file: sourcePath(file),
      })),
    );
}

describe("settings search", () => {
  it("indexes every setting written as a row, wherever its tab keeps it", () => {
    const labels = new Set(settingsIndex().map((entry) => entry.label));
    const rows = writtenRows();

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((row) => !labels.has(row.title))).toEqual([]);
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
