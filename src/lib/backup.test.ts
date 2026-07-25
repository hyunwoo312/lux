// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importSettings } from "@/lib/backup";

function makeFile(value: unknown): File {
  return new File([JSON.stringify(value)], "backup.json", { type: "application/json" });
}

function makeBackup(parts: {
  chromeLocal?: Record<string, unknown>;
  local?: Record<string, string>;
}): File {
  return makeFile({
    marker: "lux-settings-backup",
    version: 2,
    chromeLocal: parts.chromeLocal ?? {},
    local: parts.local ?? {},
  });
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { reload: vi.fn() },
  });
});

describe("importSettings", () => {
  it("rejects a backup created by a newer version of Lux", async () => {
    const file = makeFile({
      marker: "lux-settings-backup",
      version: 99,
      chromeLocal: {},
      local: {},
    });
    await expect(importSettings(file)).rejects.toThrow(/newer version/i);
  });

  it("rejects a file that is not a Lux settings backup", async () => {
    const file = makeFile({ hello: "world" });
    await expect(importSettings(file)).rejects.toThrow(/valid Lux settings file/i);
  });

  it("rejects a file that is not valid JSON", async () => {
    const file = new File(["<html>not json</html>"], "backup.json", { type: "application/json" });
    await expect(importSettings(file)).rejects.toThrow(/valid Lux settings file/i);
  });

  it("removes stored settings the backup does not contain", async () => {
    await chrome.storage.local.set({
      "lux:widget:note": { text: "stale" },
      "lux:dashboard": { widgets: ["stale"] },
    });

    await importSettings(makeBackup({ chromeLocal: { "lux:dashboard": { widgets: ["fresh"] } } }));

    const stored = await chrome.storage.local.get(null);
    expect(stored).not.toHaveProperty("lux:widget:note");
    expect(stored["lux:dashboard"]).toEqual({ widgets: ["fresh"] });
  });

  it("keeps connected accounts when replacing", async () => {
    await chrome.storage.local.set({
      "lux:integrations": { accounts: ["spotify"] },
      "lux:integration-config": { spotify: { clientId: "abc" } },
    });

    await importSettings(makeBackup({ chromeLocal: { "lux:dashboard": { widgets: [] } } }));

    const stored = await chrome.storage.local.get(null);
    expect(stored["lux:integrations"]).toEqual({ accounts: ["spotify"] });
    expect(stored["lux:integration-config"]).toEqual({ spotify: { clientId: "abc" } });
  });

  it("leaves existing settings intact when the write fails", async () => {
    await chrome.storage.local.set({ "lux:dashboard": { widgets: ["mine"] } });
    vi.spyOn(chrome.storage.local, "set").mockRejectedValueOnce(new Error("quota exceeded"));

    await expect(
      importSettings(makeBackup({ chromeLocal: { "lux:dashboard": { widgets: ["theirs"] } } })),
    ).rejects.toThrow(/quota/i);

    const stored = await chrome.storage.local.get(null);
    expect(stored["lux:dashboard"]).toEqual({ widgets: ["mine"] });
  });

  it("removes local keys the backup does not contain", async () => {
    localStorage.setItem("lux.theme", "light");
    localStorage.setItem("unrelated", "keep me");

    await importSettings(makeBackup({ local: { "lux.welcome.seen": "1" } }));

    expect(localStorage.getItem("lux.theme")).toBeNull();
    expect(localStorage.getItem("lux.welcome.seen")).toBe("1");
    expect(localStorage.getItem("unrelated")).toBe("keep me");
  });
});
