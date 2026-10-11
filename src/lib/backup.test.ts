// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importSettings } from "@/lib/backup";
import "@/stores/useDashboardStore";
import "@/widgets/note";
import { upgradeProfile } from "@/lib/profile";

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
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { reload: vi.fn() },
  });
});

describe("importSettings", () => {
  it("rejects a corrupted note instead of silently replacing its text with an empty default", async () => {
    await chrome.storage.local.set({ "lux:widget:note": { text: "keep" } });
    await expect(
      importSettings(
        makeBackup({
          chromeLocal: {
            "lux:widget:note": {
              state: { byInstance: { a: { text: 123, fontSize: "base" } } },
              version: 2,
            },
          },
        }),
      ),
    ).rejects.toThrow(/unreadable/i);
    expect((await chrome.storage.local.get(null))["lux:widget:note"]).toEqual({ text: "keep" });
  });
  it("rejects corrupted store data before pruning existing notes", async () => {
    const before = {
      "lux:widget:note": {
        state: { byInstance: { mine: { text: "keep", fontSize: "base" } } },
        version: 2,
      },
    };
    await chrome.storage.local.set(before);
    await expect(
      importSettings(
        makeBackup({
          chromeLocal: { "lux:dashboard": { state: { widgets: "bad", layout: [] }, version: 1 } },
        }),
      ),
    ).rejects.toThrow(/unreadable/i);
    expect((await chrome.storage.local.get(null))["lux:widget:note"]).toEqual(
      before["lux:widget:note"],
    );
    expect(location.reload).not.toHaveBeenCalled();
  });

  it("rolls back both stores after a pruning failure", async () => {
    const before = { "lux:widget:note": { text: "keep" } };
    await chrome.storage.local.set(before);
    localStorage.setItem("lux.theme", "light");
    vi.spyOn(chrome.storage.local, "remove").mockRejectedValueOnce(new Error("prune failed"));
    await expect(
      importSettings(makeBackup({ chromeLocal: { "lux:dashboard": { widgets: [], layout: [] } } })),
    ).rejects.toThrow(/prune failed/);
    expect((await chrome.storage.local.get(null))["lux:widget:note"]).toEqual(
      before["lux:widget:note"],
    );
    expect((await chrome.storage.local.get(null))["lux:dashboard"]).toBeUndefined();
    expect(localStorage.getItem("lux.theme")).toBe("light");
    expect(location.reload).not.toHaveBeenCalled();
  });

  it("rolls back chrome settings after a local quota failure", async () => {
    await chrome.storage.local.set({ "lux:widget:note": { text: "keep" } });
    localStorage.setItem("lux.theme", "light");
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    await expect(importSettings(makeBackup({ local: { "lux.theme": "dark" } }))).rejects.toThrow(
      /full/,
    );
    expect((await chrome.storage.local.get(null))["lux:widget:note"]).toEqual({ text: "keep" });
    expect(localStorage.getItem("lux.theme")).toBe("light");
    expect(location.reload).not.toHaveBeenCalled();
  });

  it("migrates a legacy singleton note without replacing the profile ledger", async () => {
    await chrome.storage.local.set({ "lux:profile": { version: 3 } });
    await importSettings(
      makeBackup({
        chromeLocal: {
          "lux:profile": { version: 1 },
          "lux:widget:note": { state: { text: "legacy", fontSize: "lg" }, version: 1 },
        },
      }),
    );
    expect((await chrome.storage.local.get(null))["lux:widget:note"]).toMatchObject({
      state: { byInstance: { note: { text: "legacy", fontSize: "lg" } } },
      version: 2,
    });
    expect((await chrome.storage.local.get(null))["lux:profile"]).toEqual({ version: 3 });
  });
  it("rejects a backup created by a newer version of Lux", async () => {
    const file = makeFile({
      marker: "lux-settings-backup",
      version: 99,
      chromeLocal: {},
      local: {},
    });
    await expect(importSettings(file)).rejects.toThrow(/newer version/i);
  });

  it("refuses a file too large to be a settings backup", async () => {
    const huge = new File(["x"], "huge.json", { type: "application/json" });
    Object.defineProperty(huge, "size", { value: 9 * 1024 * 1024 });

    await expect(importSettings(huge)).rejects.toThrow(/too large/);
  });

  it("rejects a file that is not a Lux settings backup", async () => {
    const file = makeFile({ hello: "world" });
    await expect(importSettings(file)).rejects.toThrow(/valid Lux settings file/i);
  });

  it("rejects a file that is not valid JSON", async () => {
    const file = new File(["<html>not json</html>"], "backup.json", { type: "application/json" });
    await expect(importSettings(file)).rejects.toThrow(/valid Lux settings file/i);
  });

  it("keeps the profile when the file carries members that are not key maps", async () => {
    await chrome.storage.local.set({ "lux:dashboard": { widgets: ["mine"] } });
    const file = makeFile({
      marker: "lux-settings-backup",
      version: 1,
      chromeLocal: "x",
      local: "y",
    });

    await expect(importSettings(file)).rejects.toThrow(/valid Lux settings file/i);
    expect((await chrome.storage.local.get(null))["lux:dashboard"]).toEqual({ widgets: ["mine"] });
  });

  it("removes stored settings the backup does not contain", async () => {
    await chrome.storage.local.set({
      "lux:widget:note": { text: "stale" },
      "lux:dashboard": { widgets: ["stale"] },
    });

    await importSettings(
      makeBackup({
        chromeLocal: {
          "lux:dashboard": {
            widgets: [{ id: "fresh", type: "note" }],
            layout: [{ i: "fresh", x: 0, y: 0, w: 6, h: 6 }],
          },
        },
      }),
    );

    const stored = await chrome.storage.local.get(null);
    expect(stored).not.toHaveProperty("lux:widget:note");
    expect(stored["lux:dashboard"]).toMatchObject({
      state: {
        widgets: [{ id: "fresh", type: "note" }],
        layout: [{ i: "fresh", x: 0, y: 0, w: 6, h: 6 }],
      },
    });
  });

  it("keeps connected accounts when replacing", async () => {
    await chrome.storage.local.set({
      "lux:integrations": { accounts: ["spotify"] },
      "lux:integration-config": { spotify: { clientId: "abc" } },
    });

    await importSettings(
      makeBackup({ chromeLocal: { "lux:dashboard": { widgets: [], layout: [] } } }),
    );

    const stored = await chrome.storage.local.get(null);
    expect(stored["lux:integrations"]).toEqual({ accounts: ["spotify"] });
    expect(stored["lux:integration-config"]).toEqual({ spotify: { clientId: "abc" } });
  });

  it("keeps Google signed in after importing a backup from before the profile ledger", async () => {
    const integrations = {
      accounts: {
        "google-1": {
          id: "google-1",
          providerId: "google",
          status: "connected",
          lastAuthorizedAt: "2026-09-01T00:00:00.000Z",
          token: { accessToken: "a", refreshToken: "r" },
        },
      },
    };
    await chrome.storage.local.set({
      "lux:profile": { version: 3 },
      "lux:integrations": integrations,
    });

    await importSettings(
      makeBackup({ chromeLocal: { "lux:dashboard": { widgets: [], layout: [] } } }),
    );
    await upgradeProfile();

    expect((await chrome.storage.local.get(null))["lux:integrations"]).toEqual(integrations);
  });

  it("leaves existing settings intact when the write fails", async () => {
    await chrome.storage.local.set({ "lux:dashboard": { widgets: ["mine"] } });
    vi.spyOn(chrome.storage.local, "set").mockRejectedValueOnce(new Error("quota exceeded"));

    await expect(
      importSettings(
        makeBackup({
          chromeLocal: {
            "lux:dashboard": { widgets: [{ id: "theirs", type: "note" }], layout: [] },
          },
        }),
      ),
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
