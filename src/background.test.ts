import { beforeEach, describe, expect, it, vi } from "vitest";
import { anilistProvider } from "@/integrations/providers/anilist";
import { ANILIST_CALLBACK_KEY, CHANGELOG_PENDING_KEY } from "@/lib/extension-keys";
import { EXTENSION_LOCAL_KEYS, EXTENSION_SESSION_KEYS } from "@/lib/profile";

const STATE = "state-abc";

type MessageListener = (
  message: unknown,
  sender: { tab?: { id?: number } },
  sendResponse: (response?: unknown) => void,
) => unknown;

function chromeMock() {
  return globalThis.chrome as unknown as {
    runtime: {
      onMessage: { addListener: ReturnType<typeof vi.fn> };
      onInstalled: { addListener: ReturnType<typeof vi.fn> };
    };
    tabs: { remove: ReturnType<typeof vi.fn> };
    storage: {
      session: {
        get: (key: string) => Promise<Record<string, unknown>>;
        set: ReturnType<typeof vi.fn>;
        clear: () => void;
      };
    };
  };
}

async function loadWorker(): Promise<MessageListener> {
  vi.resetModules();
  await import("@/background");
  const listener = chromeMock().runtime.onMessage.addListener.mock.calls.at(-1)?.[0] as
    | MessageListener
    | undefined;
  if (!listener) throw new Error("background.ts registered no onMessage listener");
  return listener;
}

async function loadInstalledListener(): Promise<(details: { reason: string }) => void> {
  vi.resetModules();
  await import("@/background");
  const listener = chromeMock().runtime.onInstalled.addListener.mock.calls.at(-1)?.[0] as
    | ((details: { reason: string }) => void)
    | undefined;
  if (!listener) throw new Error("background.ts registered no onInstalled listener");
  return listener;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function oauthMessage(overrides: Record<string, unknown> = {}) {
  return { type: "anilist-oauth", accessToken: "tok", state: STATE, ...overrides };
}

describe("background worker — AniList callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chromeMock().storage.session.clear();
  });

  it("stashes the callback and closes the tab it came from", async () => {
    const listener = await loadWorker();
    const sendResponse = vi.fn();
    listener(
      oauthMessage({ tokenType: "Bearer", expiresIn: "3600" }),
      { tab: { id: 42 } },
      sendResponse,
    );
    await flush();

    const stored = await chromeMock().storage.session.get(ANILIST_CALLBACK_KEY);
    expect(stored[ANILIST_CALLBACK_KEY]).toMatchObject({ accessToken: "tok", state: STATE });
    expect(chromeMock().tabs.remove).toHaveBeenCalledWith(42);
    expect(sendResponse).toHaveBeenCalledWith({ received: true });
  });

  it("closes the tab when AniList returns an error instead of a token", async () => {
    const listener = await loadWorker();
    listener(
      { type: "anilist-oauth", error: "access_denied", state: STATE },
      { tab: { id: 7 } },
      vi.fn(),
    );
    await flush();
    expect(chromeMock().tabs.remove).toHaveBeenCalledWith(7);
  });

  it("ignores a callback that carries neither a token nor an error", async () => {
    const listener = await loadWorker();
    listener({ type: "anilist-oauth", state: STATE }, { tab: { id: 11 } }, vi.fn());
    await flush();

    expect(await chromeMock().storage.session.get(ANILIST_CALLBACK_KEY)).toEqual({});
    expect(chromeMock().tabs.remove).not.toHaveBeenCalled();
  });

  it("ignores a callback whose fields are not strings", async () => {
    const listener = await loadWorker();
    listener(oauthMessage({ accessToken: { token: "tok" } }), { tab: { id: 11 } }, vi.fn());
    await flush();

    expect(await chromeMock().storage.session.get(ANILIST_CALLBACK_KEY)).toEqual({});
    expect(chromeMock().tabs.remove).not.toHaveBeenCalled();
  });

  it("still closes the tab when the stash write fails", async () => {
    const listener = await loadWorker();
    chromeMock().storage.session.set.mockRejectedValueOnce(new Error("quota"));
    listener(oauthMessage(), { tab: { id: 9 } }, vi.fn());
    await flush();
    expect(chromeMock().tabs.remove).toHaveBeenCalledWith(9);
  });

  it("closes nothing when the sender has no tab", async () => {
    const listener = await loadWorker();
    listener(oauthMessage(), {}, vi.fn());
    await flush();
    expect(chromeMock().tabs.remove).not.toHaveBeenCalled();
  });

  it("ignores unrelated message types", async () => {
    const listener = await loadWorker();
    listener({ type: "something-else" }, { tab: { id: 3 } }, vi.fn());
    await flush();
    expect(chromeMock().tabs.remove).not.toHaveBeenCalled();
  });

  it("settles a pending acquireToken and closes the tab", async () => {
    const listener = await loadWorker();
    const acquire = anilistProvider.acquireToken;
    if (!acquire) throw new Error("anilistProvider must expose acquireToken");

    const pending = acquire({ clientId: "c", state: STATE, interactive: true } as never);
    await flush();
    listener(
      oauthMessage({ accessToken: "tok-e2e", tokenType: "Bearer", expiresIn: "3600" }),
      { tab: { id: 1 } },
      vi.fn(),
    );

    await expect(pending).resolves.toMatchObject({ accessToken: "tok-e2e", tokenType: "Bearer" });
    expect(chromeMock().tabs.remove).toHaveBeenCalledWith(1);
  });
});

describe("background worker — install and update", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await chrome.storage.local.clear();
  });

  it("queues the changelog for the version it just updated to", async () => {
    const onInstalled = await loadInstalledListener();

    onInstalled({ reason: "update" });
    await flush();

    expect(await chrome.storage.local.get(CHANGELOG_PENDING_KEY)).toEqual({
      [CHANGELOG_PENDING_KEY]: "9.9.9",
    });
  });

  it("shows a fresh install nothing it has not seen", async () => {
    const onInstalled = await loadInstalledListener();

    onInstalled({ reason: "install" });
    await flush();

    expect(await chrome.storage.local.get(CHANGELOG_PENDING_KEY)).toEqual({});
  });
});

describe("background worker — storage keys", () => {
  it("writes only keys the profile registry knows about", () => {
    expect(EXTENSION_SESSION_KEYS).toContain(ANILIST_CALLBACK_KEY);
    expect(EXTENSION_LOCAL_KEYS).toContain(CHANGELOG_PENDING_KEY);
  });
});
