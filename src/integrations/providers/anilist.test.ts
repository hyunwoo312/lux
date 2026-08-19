import { beforeEach, describe, expect, it, vi } from "vitest";
import { anilistProvider } from "@/integrations/providers/anilist";
import { IntegrationReconnectRequiredError } from "@/integrations/errors";

const CALLBACK_KEY = "lux:anilist-callback";
const STATE = "state-abc";

type Removed = (tabId: number) => void;

function chromeMock() {
  return globalThis.chrome as unknown as {
    tabs: {
      create: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
      onRemoved: { addListener: ReturnType<typeof vi.fn> };
    };
    storage: {
      session: { set: (items: Record<string, unknown>) => Promise<void>; clear: () => void };
    };
  };
}

function requireAcquireToken() {
  const fn = anilistProvider.acquireToken;
  if (!fn) throw new Error("anilistProvider must expose acquireToken");
  return fn;
}

const acquireToken = requireAcquireToken();

function acquire() {
  return acquireToken({
    clientId: "client",
    state: STATE,
    interactive: true,
    redirectUri: "",
    scopes: [],
  } as never);
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("anilistProvider.acquireToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chromeMock().storage.session.clear();
  });

  it("rejects without opening a tab when not interactive", async () => {
    await expect(
      acquireToken({ clientId: "c", state: STATE, interactive: false } as never),
    ).rejects.toBeInstanceOf(IntegrationReconnectRequiredError);
    expect(chromeMock().tabs.create).not.toHaveBeenCalled();
  });

  it("resolves from the callback the service worker stashed", async () => {
    const pending = acquire();
    await flush();

    await chromeMock().storage.session.set({
      [CALLBACK_KEY]: { accessToken: "token-1", expiresIn: "3600", state: STATE },
    });

    await expect(pending).resolves.toMatchObject({
      accessToken: "token-1",
      expiresIn: 3600,
      tokenType: "Bearer",
    });
  });

  it("ignores a callback whose state does not match", async () => {
    const pending = acquire();
    await flush();

    let settled = false;
    void pending.then(
      () => (settled = true),
      () => (settled = true),
    );

    await chromeMock().storage.session.set({
      [CALLBACK_KEY]: { accessToken: "token-2", state: "someone-elses-state" },
    });
    await flush();

    expect(settled).toBe(false);
  });

  it("does not report cancellation when the worker closes the tab after a successful callback", async () => {
    const pending = acquire();
    await flush();

    const onRemoved = chromeMock().tabs.onRemoved.addListener.mock.calls[0]?.[0] as Removed;

    await chromeMock().storage.session.set({
      [CALLBACK_KEY]: { accessToken: "token-3", state: STATE },
    });
    onRemoved(1);

    await expect(pending).resolves.toMatchObject({ accessToken: "token-3" });
  });

  it("rejects as cancelled when the tab closes with no callback stashed", async () => {
    const pending = acquire();
    await flush();

    const onRemoved = chromeMock().tabs.onRemoved.addListener.mock.calls[0]?.[0] as Removed;
    onRemoved(1);

    await expect(pending).rejects.toThrow(/cancelled/i);
  });

  it("rejects when the callback carries an error", async () => {
    const pending = acquire();
    await flush();

    await chromeMock().storage.session.set({
      [CALLBACK_KEY]: { error: "access_denied", state: STATE },
    });

    await expect(pending).rejects.toThrow(/could not be completed/i);
  });
});
