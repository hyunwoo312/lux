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

  it("does not mistake an update-only marker for an older profile", async () => {
    await chrome.storage.local.set({ "lux:changelog-pending": "2.0.0" });
    const get = vi.spyOn(chrome.storage.local, "get");

    await upgradeProfile();

    expect(await stamp()).toEqual({ version: PROFILE_VERSION });
    expect(get.mock.calls.filter(([keys]) => Array.isArray(keys))).toEqual([]);
    get.mockRestore();
  });

  it("leaves a profile written by a newer Lux alone", async () => {
    const future = { "lux:profile": { version: PROFILE_VERSION + 5 }, "lux:something-new": 1 };
    await chrome.storage.local.set(future);

    await upgradeProfile();

    expect(await all()).toEqual(future);
  });

  it("prefers the value already at the new key and drops the old one", async () => {
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

describe("moving Google off the relay", () => {
  const googleAccount = {
    id: "google-1",
    providerId: "google",
    providerAccountId: "1",
    displayName: "Someone",
    status: "connected",
    connectedAt: "2026-08-01T00:00:00.000Z",
    token: { accessToken: "a", refreshToken: "r", expiresAt: 1, tokenType: "Bearer", scopes: [] },
  };
  const spotifyAccount = { ...googleAccount, id: "spotify-1", providerId: "spotify" };

  it("drops the relay token and asks the user to reconnect Google", async () => {
    await chrome.storage.local.set({
      "lux:integrations": { accounts: { "google-1": googleAccount } },
    });

    await upgradeProfile();

    const stored = (await all())["lux:integrations"] as {
      accounts: Record<string, { status: string; token?: unknown; lastError?: string }>;
    };
    expect(stored.accounts["google-1"]?.status).toBe("needsReconnect");
    expect(stored.accounts["google-1"]).not.toHaveProperty("token");
    expect(stored.accounts["google-1"]?.lastError).toMatch(/reconnect/i);
  });

  it("still runs for a profile already stamped at the previous version", async () => {
    await chrome.storage.local.set({
      "lux:profile": { version: 2 },
      "lux:integrations": { accounts: { "google-1": googleAccount } },
    });

    await upgradeProfile();

    const stored = (await all())["lux:integrations"] as {
      accounts: Record<string, { status: string }>;
    };
    expect(stored.accounts["google-1"]?.status).toBe("needsReconnect");
  });

  it("leaves every other provider connected", async () => {
    await chrome.storage.local.set({
      "lux:integrations": { accounts: { "google-1": googleAccount, "spotify-1": spotifyAccount } },
    });

    await upgradeProfile();

    const stored = (await all())["lux:integrations"] as {
      accounts: Record<string, { status: string; token?: unknown }>;
    };
    expect(stored.accounts["spotify-1"]).toEqual(spotifyAccount);
  });

  it("refuses to rewrite an unreadable account blob rather than rebuilding it", async () => {
    await chrome.storage.local.set({ "lux:integrations": "not an object" });

    await upgradeProfile();

    expect((await all())["lux:integrations"]).toBe("not an object");
  });
});

describe("settling three persisted field names", () => {
  const calendarBlob = (entry: Record<string, unknown>) => ({
    "lux:widget:calendar": { state: { byInstance: { one: entry } }, version: 2 },
  });
  const read = async (key: string) =>
    (await all())[key] as { state: { byInstance: Record<string, Record<string, unknown>> } };

  it("pads a calendar anchor written with a zero-based month, keeping the rest", async () => {
    await chrome.storage.local.set(
      calendarBlob({ listAnchorKey: "2026-7-29", listAnchorSetOn: "2026-7-29", lookaheadDays: 14 }),
    );

    await upgradeProfile();

    expect((await read("lux:widget:calendar")).state.byInstance.one).toEqual({
      listAnchorKey: "2026-08-29",
      listAnchorSetOn: "2026-08-29",
      lookaheadDays: 14,
    });
  });

  it("leaves an anchor that is already padded alone, however often it runs", async () => {
    await chrome.storage.local.set(
      calendarBlob({ listAnchorKey: "2026-08-29", listAnchorSetOn: "2026-08-29" }),
    );

    await upgradeProfile();
    await chrome.storage.local.set({ "lux:profile": { version: 3 } });
    await upgradeProfile();

    expect((await read("lux:widget:calendar")).state.byInstance.one).toEqual({
      listAnchorKey: "2026-08-29",
      listAnchorSetOn: "2026-08-29",
    });
  });

  it("turns the old stocks show/hide flag into the index rail it now means", async () => {
    await chrome.storage.local.set({
      "lux:widget:stocks": {
        state: {
          byInstance: {
            shown: { showIndices: true, indexSymbols: [] },
            picked: { showIndices: true, indexSymbols: ["^VIX"] },
            hidden: { showIndices: false, indexSymbols: [] },
          },
        },
        version: 1,
      },
    });

    await upgradeProfile();
    const { byInstance } = (await read("lux:widget:stocks")).state;

    expect(byInstance.shown).toEqual({ indexSymbols: ["^GSPC", "^IXIC", "^DJI"] });
    expect(byInstance.picked).toEqual({ indexSymbols: ["^VIX"] });
    expect(byInstance.hidden).toEqual({ indexSymbols: [] });
  });

  it("renames the account stamp to what it has always recorded", async () => {
    await chrome.storage.local.set({
      "lux:integrations": {
        accounts: {
          "spotify-1": {
            id: "spotify-1",
            providerId: "spotify",
            lastSyncedAt: "2026-08-01T00:00:00.000Z",
          },
        },
      },
    });

    await upgradeProfile();
    const stored = (await all())["lux:integrations"] as {
      accounts: Record<string, Record<string, unknown>>;
    };

    expect(stored.accounts["spotify-1"]).toEqual({
      id: "spotify-1",
      providerId: "spotify",
      lastAuthorizedAt: "2026-08-01T00:00:00.000Z",
    });
  });
});

describe("when the ledger cannot finish", () => {
  it("never leaves stores waiting when the ledger itself fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(chrome.storage.local, "get").mockRejectedValue(new Error("storage down"));

    await expect(profileReady()).rejects.toThrow("storage down");
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
