// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccountByProvider, writeAccount } from "@/integrations/token-store";
import type { IntegrationAccount, IntegrationProviderId } from "@/integrations/types";

const account = (id: string, providerId: IntegrationProviderId): IntegrationAccount => ({
  id,
  providerId,
  providerAccountId: id,
  displayName: id,
  status: "connected",
  connectedAt: "2026-01-01T00:00:00.000Z",
  token: {
    accessToken: `${id}-access`,
    refreshToken: `${id}-refresh`,
    expiresAt: 9_999_999_999,
    tokenType: "Bearer",
    scopes: ["read"],
  },
});

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("connected accounts", () => {
  it("survive a transient read failure during another provider's write", async () => {
    await writeAccount(account("google-1", "google"));
    await writeAccount(account("github-1", "github"));
    vi.spyOn(chrome.storage.local, "get").mockRejectedValueOnce(new Error("transient"));

    await expect(writeAccount(account("spotify-1", "spotify"))).rejects.toThrow(
      /could not be read/,
    );

    vi.restoreAllMocks();
    expect((await getAccountByProvider("google"))?.token?.refreshToken).toBe("google-1-refresh");
    expect((await getAccountByProvider("github"))?.token?.refreshToken).toBe("github-1-refresh");
  });

  it("survive a stored blob that cannot be parsed", async () => {
    await writeAccount(account("google-1", "google"));
    await chrome.storage.local.set({ "lux:integrations": { accounts: "not-a-record" } });

    await expect(writeAccount(account("spotify-1", "spotify"))).rejects.toThrow(
      /could not be read/,
    );

    const stored = await chrome.storage.local.get("lux:integrations");
    expect(stored["lux:integrations"]).toEqual({ accounts: "not-a-record" });
  });

  it("still write normally when there is nothing stored yet", async () => {
    await chrome.storage.local.clear();

    await writeAccount(account("google-1", "google"));

    expect((await getAccountByProvider("google"))?.displayName).toBe("google-1");
  });
});
