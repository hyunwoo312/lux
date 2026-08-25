// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROFILE_VERSION, profileReady, upgradeProfile } from "@/lib/profile";

const all = () => chrome.storage.local.get(null);
const stamp = async () => (await all())["lux:profile"];

beforeEach(async () => {
  await chrome.storage.local.clear();
});

describe("upgrading a profile", () => {
  it("stamps a fresh install as current without running anything", async () => {
    await upgradeProfile();

    expect(await stamp()).toEqual({ version: PROFILE_VERSION });
    expect(Object.keys(await all())).toEqual(["lux:profile"]);
  });

  it("carries an unstamped 1.3.x profile onto the new key names", async () => {
    await chrome.storage.local.set({
      "lux:lux:feedback": { state: { draft: "half a thought" }, version: 1 },
      "lux:widget-settings": { state: { settings: { "note-1": { background: "solid" } } } },
      "lux:widget:note": { state: { byInstance: {} }, version: 2 },
    });

    await upgradeProfile();
    const stored = await all();

    expect(stored["lux:feedback"]).toEqual({ state: { draft: "half a thought" }, version: 1 });
    expect(stored["lux:widget:settings"]).toEqual({
      state: { settings: { "note-1": { background: "solid" } } },
    });
    expect(stored["lux:lux:feedback"]).toBeUndefined();
    expect(stored["lux:widget-settings"]).toBeUndefined();
    expect(stored["lux:widget:note"]).toBeDefined();
    expect(await stamp()).toEqual({ version: PROFILE_VERSION });
  });

  it("runs once — a second open changes nothing", async () => {
    await chrome.storage.local.set({ "lux:lux:feedback": { state: { draft: "keep" } } });
    await upgradeProfile();
    const afterFirst = await all();

    await upgradeProfile();

    expect(await all()).toEqual(afterFirst);
  });

  it("leaves a profile written by a newer Lux alone", async () => {
    const future = { "lux:profile": { version: PROFILE_VERSION + 5 }, "lux:something-new": 1 };
    await chrome.storage.local.set(future);

    await upgradeProfile();

    expect(await all()).toEqual(future);
  });

  it("keeps the old key when the new one is already there", async () => {
    await chrome.storage.local.set({
      "lux:lux:feedback": { state: { draft: "old" } },
      "lux:feedback": { state: { draft: "new" } },
    });

    await upgradeProfile();
    const stored = await all();

    expect(stored["lux:feedback"]).toEqual({ state: { draft: "new" } });
    expect(stored["lux:lux:feedback"]).toBeUndefined();
  });
});

describe("when the ledger cannot finish", () => {
  it("never leaves stores waiting when the ledger itself fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(chrome.storage.local, "get").mockRejectedValue(new Error("storage down"));

    await expect(profileReady()).resolves.toBeUndefined();
  });

  it("does not stamp when a migration could not finish, so it retries", async () => {
    vi.restoreAllMocks();
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ "lux:lux:feedback": { state: { draft: "keep me" } } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const set = vi
      .spyOn(chrome.storage.local, "set")
      .mockRejectedValueOnce(new Error("write down"));

    await upgradeProfile().catch(() => undefined);
    set.mockRestore();
    const afterFailure = await all();
    expect(afterFailure["lux:profile"]).toBeUndefined();
    expect(afterFailure["lux:lux:feedback"]).toBeDefined();

    await upgradeProfile();
    const afterRetry = await all();
    expect(afterRetry["lux:feedback"]).toEqual({ state: { draft: "keep me" } });
    expect(afterRetry["lux:profile"]).toEqual({ version: PROFILE_VERSION });
  });

  it("treats a garbage stamp as an unstamped profile rather than trusting it", async () => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      "lux:profile": "not-an-object",
      "lux:lux:feedback": { state: { draft: "still here" } },
    });

    await upgradeProfile();
    const stored = await all();

    expect(stored["lux:feedback"]).toEqual({ state: { draft: "still here" } });
    expect(stored["lux:profile"]).toEqual({ version: PROFILE_VERSION });
  });
});
